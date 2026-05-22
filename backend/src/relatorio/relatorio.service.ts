import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isQuitado } from '../domain/quitacao';

@Injectable()
export class RelatorioService {
  constructor(private prisma: PrismaService) {}

  async resumoExcursao(excursaoId: string) {
    const excursao = await this.prisma.excursao.findUniqueOrThrow({
      where: { id: excursaoId },
      include: {
        inscricoes: {
          include: { parcelas: true },
        },
      },
    });

    const totalInscricoes = excursao.inscricoes.length;
    const quitados = excursao.inscricoes.filter((i) =>
      isQuitado(i.parcelas),
    ).length;
    const comAssento = excursao.inscricoes.filter(
      (i) => i.numeroAssento !== null,
    ).length;
    const totalArrecadado = await this.prisma.pagamento.aggregate({
      where: { parcela: { inscricao: { excursaoId } } },
      _sum: { valorPago: true },
    });

    return {
      excursao: {
        id: excursao.id,
        nome: excursao.nome,
        destino: excursao.destino,
        status: excursao.status,
        dataIda: excursao.dataIda,
        dataVolta: excursao.dataVolta,
        valor: excursao.valor,
        numParcelas: excursao.numParcelas,
        tipoVeiculo: excursao.tipoVeiculo,
        totalAssentos: excursao.totalAssentos,
      },
      totalInscricoes,
      vagasDisponiveis: excursao.totalAssentos - totalInscricoes,
      comAssento,
      semAssento: totalInscricoes - comAssento,
      quitados,
      pendentes: totalInscricoes - quitados,
      totalArrecadado: totalArrecadado._sum.valorPago ?? 0,
      potencialTotal: excursao.valor.mul(totalInscricoes),
    };
  }
}
