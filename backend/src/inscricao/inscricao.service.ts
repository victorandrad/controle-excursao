import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InscreverDto } from './inscricao.dto';
import { isQuitado } from '../domain/quitacao';

@Injectable()
export class InscricaoService {
  constructor(private prisma: PrismaService) {}

  async listarPorExcursao(excursaoId: string) {
    const inscricoes = await this.prisma.inscricao.findMany({
      where: { excursaoId },
      include: { participante: true, parcelas: true },
      orderBy: [{ numeroAssento: 'asc' }, { criadoEm: 'asc' }],
    });
    return inscricoes.map((i) => ({ ...i, quitado: isQuitado(i.parcelas) }));
  }

  async listarPorParticipante(excursaoId: string, participanteId: string) {
    const inscricoes = await this.prisma.inscricao.findMany({
      where: { excursaoId, participanteId },
      include: {
        parcelas: {
          include: { pagamentos: true },
          orderBy: [{ status: 'asc' }, { numero: 'asc' }],
        },
      },
      orderBy: { criadoEm: 'asc' },
    });
    return inscricoes.map((i) => ({ ...i, quitado: isQuitado(i.parcelas) }));
  }

  async assentosLivres(excursaoId: string) {
    const excursao = await this.prisma.excursao.findUnique({
      where: { id: excursaoId },
    });
    if (!excursao) throw new NotFoundException('Excursão não encontrada');

    const ocupados = await this.prisma.inscricao.findMany({
      where: { excursaoId, numeroAssento: { not: null } },
      select: { numeroAssento: true },
    });
    const ocupadosSet = new Set(ocupados.map((o) => o.numeroAssento));

    const livres: number[] = [];
    for (let i = 1; i <= excursao.totalAssentos; i++) {
      if (!ocupadosSet.has(i)) livres.push(i);
    }
    return livres;
  }

  async inscrever(dto: InscreverDto) {
    const excursao = await this.prisma.excursao.findUnique({
      where: { id: dto.excursaoId },
    });
    if (!excursao) throw new NotFoundException('Excursão não encontrada');
    if (excursao.status !== 'aberta')
      throw new BadRequestException('Excursão não está aberta');

    const total = await this.prisma.inscricao.count({
      where: { excursaoId: dto.excursaoId },
    });
    if (total + dto.quantidade > excursao.totalAssentos) {
      const restantes = excursao.totalAssentos - total;
      throw new BadRequestException(
        `Sem vagas suficientes: ${restantes} disponível(is)`,
      );
    }

    return this.prisma.$transaction(
      Array.from({ length: dto.quantidade }, () =>
        this.prisma.inscricao.create({
          data: {
            excursaoId: dto.excursaoId,
            participanteId: dto.participanteId,
            parcelas: {
              create: Array.from({ length: excursao.numParcelas }, (_, i) => ({
                numero: i + 1,
                status: 'pendente' as const,
              })),
            },
          },
          include: { parcelas: true },
        }),
      ),
    );
  }

  async trocarAssentos(inscricaoAId: string, inscricaoBId: string) {
    if (inscricaoAId === inscricaoBId) {
      throw new BadRequestException('Inscrições iguais');
    }
    return this.prisma.$transaction(async (tx) => {
      const a = await tx.inscricao.findUnique({ where: { id: inscricaoAId } });
      const b = await tx.inscricao.findUnique({ where: { id: inscricaoBId } });
      if (!a || !b) throw new NotFoundException('Inscrição não encontrada');
      if (a.excursaoId !== b.excursaoId) {
        throw new BadRequestException('Inscrições de excursões diferentes');
      }
      const aOld = a.numeroAssento;
      const bOld = b.numeroAssento;
      // Sequência que evita violar o unique [excursaoId, numeroAssento]:
      // 1) limpa A   2) B recebe assento antigo de A   3) A recebe assento antigo de B
      await tx.inscricao.update({
        where: { id: inscricaoAId },
        data: { numeroAssento: null },
      });
      await tx.inscricao.update({
        where: { id: inscricaoBId },
        data: { numeroAssento: aOld },
      });
      return tx.inscricao.update({
        where: { id: inscricaoAId },
        data: { numeroAssento: bOld },
      });
    });
  }

  async atribuirAssento(inscricaoId: string, numeroAssento: number | null) {
    const inscricao = await this.prisma.inscricao.findUnique({
      where: { id: inscricaoId },
      include: { excursao: true },
    });
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada');

    if (numeroAssento !== null) {
      if (
        numeroAssento < 1 ||
        numeroAssento > inscricao.excursao.totalAssentos
      ) {
        throw new BadRequestException(
          `Assento fora do intervalo 1..${inscricao.excursao.totalAssentos}`,
        );
      }
      const ocupado = await this.prisma.inscricao.findFirst({
        where: {
          excursaoId: inscricao.excursaoId,
          numeroAssento,
          id: { not: inscricaoId },
        },
      });
      if (ocupado) {
        throw new ConflictException(`Assento ${numeroAssento} já está ocupado`);
      }
    }

    return this.prisma.inscricao.update({
      where: { id: inscricaoId },
      data: { numeroAssento },
    });
  }
}
