import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarExcursaoDto, AtualizarExcursaoDto } from './excursao.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExcursaoService {
  constructor(private prisma: PrismaService) {}

  async listar() {
    const excursoes = await this.prisma.excursao.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { _count: { select: { inscricoes: true } } },
    });
    return excursoes.map(({ _count, ...e }) => ({
      ...e,
      inscritos: _count.inscricoes,
    }));
  }

  async buscar(id: string) {
    const excursao = await this.prisma.excursao.findUnique({ where: { id } });
    if (!excursao) throw new NotFoundException('Excursão não encontrada');
    return excursao;
  }

  criar(dto: CriarExcursaoDto) {
    return this.prisma.excursao.create({
      data: {
        nome: dto.nome,
        destino: dto.destino,
        dataIda: new Date(dto.dataIda),
        dataVolta: dto.dataVolta ? new Date(dto.dataVolta) : null,
        valor: new Decimal(dto.valor),
        numParcelas: dto.numParcelas,
        tipoVeiculo: dto.tipoVeiculo,
        totalAssentos: dto.totalAssentos,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarExcursaoDto) {
    const excursao = await this.prisma.excursao.findUnique({
      where: { id },
      include: { _count: { select: { inscricoes: true } } },
    });
    if (!excursao) throw new NotFoundException('Excursão não encontrada');
    if (excursao.status === 'encerrada')
      throw new BadRequestException('Excursão encerrada não pode ser editada');

    if (
      dto.totalAssentos !== undefined &&
      dto.totalAssentos < excursao._count.inscricoes
    ) {
      throw new BadRequestException(
        `Não é possível reduzir os assentos: ${excursao._count.inscricoes} inscrição(ões) já existem`,
      );
    }

    return this.prisma.excursao.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.destino !== undefined && { destino: dto.destino }),
        ...(dto.dataIda !== undefined && { dataIda: new Date(dto.dataIda) }),
        ...(dto.dataVolta !== undefined && {
          dataVolta: dto.dataVolta ? new Date(dto.dataVolta) : null,
        }),
        ...(dto.tipoVeiculo !== undefined && { tipoVeiculo: dto.tipoVeiculo }),
        ...(dto.totalAssentos !== undefined && {
          totalAssentos: dto.totalAssentos,
        }),
      },
    });
  }

  async encerrar(id: string) {
    const excursao = await this.buscar(id);
    if (excursao.status === 'encerrada')
      throw new BadRequestException('Excursão já está encerrada');
    return this.prisma.excursao.update({
      where: { id },
      data: { status: 'encerrada' },
    });
  }

  async excluir(id: string) {
    const excursao = await this.prisma.excursao.findUnique({
      where: { id },
      include: { _count: { select: { inscricoes: true } } },
    });
    if (!excursao) throw new NotFoundException('Excursão não encontrada');
    if (excursao._count.inscricoes > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma excursão que já possui inscrições',
      );
    }
    return this.prisma.excursao.delete({ where: { id } });
  }
}
