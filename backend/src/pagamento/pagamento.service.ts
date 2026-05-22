import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarPagamentoDto } from './pagamento.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PagamentoService {
  constructor(private prisma: PrismaService) {}

  async registrar(dto: RegistrarPagamentoDto, usuarioId: string) {
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

    const dataPagamento = new Date(dto.dataPagamento);
    const agora = new Date();
    const diffDias = Math.floor(
      (agora.getTime() - dataPagamento.getTime()) / 86_400_000,
    );
    if (diffDias > 30) {
      // Apenas aviso — não bloqueia. Retornaremos flag no response.
    }

    return this.prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.create({
        data: {
          parcelaId: dto.parcelaId,
          usuarioId,
          valorPago: new Decimal(dto.valorPago),
          dataPagamento,
          metodo: dto.metodo,
          referencia: dto.referencia,
        },
      });

      await tx.parcela.update({
        where: { id: dto.parcelaId },
        data: { status: 'paga' },
      });

      return { pagamento, avisoRetroativo: diffDias > 30 };
    });
  }

  listarPorInscricao(inscricaoId: string) {
    return this.prisma.pagamento.findMany({
      where: { parcela: { inscricaoId } },
      include: { parcela: true, usuario: { select: { nome: true } } },
      orderBy: { dataPagamento: 'desc' },
    });
  }
}
