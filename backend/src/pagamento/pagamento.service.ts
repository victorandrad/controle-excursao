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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class PagamentoService {
  constructor(private prisma: PrismaService) {}

  async registrar(
    dto: RegistrarPagamentoDto,
    usuarioId: string,
    comprovante?: Express.Multer.File,
  ) {
    try {
      const parcelaInicial = await this.prisma.parcela.findUnique({
        where: { id: dto.parcelaId },
        include: {
          inscricao: {
            include: {
              excursao: true,
              parcelas: { include: { pagamentos: true } },
            },
          },
        },
      });

      if (!parcelaInicial)
        throw new NotFoundException('Parcela não encontrada');
      if (parcelaInicial.status === 'paga')
        throw new BadRequestException('Parcela já está paga');
      if (parcelaInicial.inscricao.status !== 'ativa')
        throw new BadRequestException('Inscrição cancelada');
      if (dto.metodo === 'pix' && !comprovante) {
        throw new BadRequestException(
          'Comprovante obrigatório para pagamento Pix',
        );
      }

      const { excursao, parcelas } = parcelaInicial.inscricao;
      const valorParcela = Number(excursao.valor) / excursao.numParcelas;

      // Distribuir entre pendentes a partir da clicada (inclusive), em ordem.
      const pendentes = parcelas
        .filter((p) => p.status !== 'paga' && p.numero >= parcelaInicial.numero)
        .sort((a, b) => a.numero - b.numero);

      let restante = Number(dto.valorPago);
      const plano: { parcelaId: string; valor: number; fecha: boolean }[] = [];
      for (const p of pendentes) {
        if (restante < 0.005) break;
        const jaPago = p.pagamentos.reduce(
          (acc, pg) => acc + Number(pg.valorPago),
          0,
        );
        const faltando = Math.max(0, valorParcela - jaPago);
        if (faltando < 0.005) continue; // parcial cobre tudo — pula
        const aPagar = Math.min(restante, faltando);
        plano.push({
          parcelaId: p.id,
          valor: round2(aPagar),
          fecha: restante >= faltando - 0.005,
        });
        restante = round2(restante - aPagar);
      }

      if (restante > 0.005) {
        throw new BadRequestException(
          `Valor excede o total devido em R$ ${restante.toFixed(2)}`,
        );
      }
      if (plano.length === 0) {
        throw new BadRequestException('Nada a pagar');
      }

      const dataPagamento = new Date(dto.dataPagamento);
      const diffDias = Math.floor(
        (Date.now() - dataPagamento.getTime()) / 86_400_000,
      );

      return await this.prisma.$transaction(async (tx) => {
        const criados = [];
        for (const item of plano) {
          const pg = await tx.pagamento.create({
            data: {
              parcelaId: item.parcelaId,
              usuarioId,
              valorPago: new Decimal(item.valor),
              dataPagamento,
              metodo: dto.metodo,
              referencia: dto.referencia,
              // Mesmo comprovante referenciado em todos os pagamentos da operação.
              comprovante: comprovante?.filename ?? null,
            },
          });
          criados.push(pg);
          if (item.fecha) {
            await tx.parcela.update({
              where: { id: item.parcelaId },
              data: { status: 'paga' },
            });
          }
        }
        return {
          pagamento: criados[0],
          pagamentos: criados,
          parcelasCobertas: plano.filter((p) => p.fecha).length,
          parcial: plano.some((p) => !p.fecha),
          avisoRetroativo: diffDias > 30,
        };
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
