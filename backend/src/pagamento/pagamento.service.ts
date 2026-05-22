import {
  Injectable,
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarPagamentoDto } from './pagamento.dto';
import { COMPROVANTES_DIR, mimeDoArquivo } from './comprovante.config';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PagamentoService {
  constructor(private prisma: PrismaService) {}

  async registrar(
    dto: RegistrarPagamentoDto,
    usuarioId: string,
    comprovante?: Express.Multer.File,
  ) {
    try {
      const parcela = await this.prisma.parcela.findUnique({
        where: { id: dto.parcelaId },
        include: { inscricao: { include: { excursao: true } } },
      });

      if (!parcela) throw new NotFoundException('Parcela não encontrada');
      if (parcela.status === 'paga')
        throw new BadRequestException('Parcela já está paga');
      if (parcela.inscricao.status !== 'ativa') {
        throw new BadRequestException('Inscrição cancelada');
      }
      if (dto.metodo === 'pix' && !comprovante) {
        throw new BadRequestException(
          'Comprovante obrigatório para pagamento Pix',
        );
      }

      const dataPagamento = new Date(dto.dataPagamento);
      const agora = new Date();
      const diffDias = Math.floor(
        (agora.getTime() - dataPagamento.getTime()) / 86_400_000,
      );

      return await this.prisma.$transaction(async (tx) => {
        const pagamento = await tx.pagamento.create({
          data: {
            parcelaId: dto.parcelaId,
            usuarioId,
            valorPago: new Decimal(dto.valorPago),
            dataPagamento,
            metodo: dto.metodo,
            referencia: dto.referencia,
            comprovante: comprovante?.filename ?? null,
          },
        });

        await tx.parcela.update({
          where: { id: dto.parcelaId },
          data: { status: 'paga' },
        });

        return { pagamento, avisoRetroativo: diffDias > 30 };
      });
    } catch (err) {
      // Remove o arquivo recém-salvo se a operação falhar (evita órfãos).
      if (comprovante) this.removerArquivo(comprovante.filename);
      throw err;
    }
  }

  async obterComprovante(id: string): Promise<StreamableFile> {
    const pagamento = await this.prisma.pagamento.findUnique({ where: { id } });
    if (!pagamento?.comprovante) {
      throw new NotFoundException('Comprovante não encontrado');
    }
    const caminho = join(COMPROVANTES_DIR, pagamento.comprovante);
    if (!existsSync(caminho)) {
      throw new NotFoundException('Arquivo do comprovante não encontrado');
    }
    return new StreamableFile(createReadStream(caminho), {
      type: mimeDoArquivo(pagamento.comprovante),
      disposition: `inline; filename="comprovante-${id}${extname(pagamento.comprovante)}"`,
    });
  }

  private removerArquivo(filename: string) {
    try {
      unlinkSync(join(COMPROVANTES_DIR, filename));
    } catch {
      /* arquivo pode não existir — ignora */
    }
  }

  listarPorInscricao(inscricaoId: string) {
    return this.prisma.pagamento.findMany({
      where: { parcela: { inscricaoId } },
      include: { parcela: true, usuario: { select: { nome: true } } },
      orderBy: { dataPagamento: 'desc' },
    });
  }
}
