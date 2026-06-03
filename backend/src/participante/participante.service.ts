import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CriarParticipanteDto,
  AtualizarParticipanteDto,
} from './participante.dto';

@Injectable()
export class ParticipanteService {
  constructor(private prisma: PrismaService) {}

  async listar(busca?: string, campanhaId?: string, somenteQuitados?: boolean) {
    const buscaStr = busca ?? '';
    const buscaLike = `%${buscaStr}%`;
    const buscoDigits = buscaStr.replace(/\D/g, '');
    const temBusca = !!buscaStr;
    const temFiltroQuitados = !!(somenteQuitados && campanhaId);

    if (temBusca || temFiltroQuitados) {
      const conditions: Prisma.Sql[] = [];

      if (temBusca) {
        const orParts: Prisma.Sql[] = [
          Prisma.sql`p.nome ILIKE ${buscaLike}`,
          Prisma.sql`p.cpf ILIKE ${buscaLike}`,
          Prisma.sql`p.telefone LIKE ${buscaLike}`,
        ];
        if (buscoDigits.length > 0) {
          const digitsLike = `%${buscoDigits}%`;
          orParts.push(
            Prisma.sql`REGEXP_REPLACE(p.cpf, '[^0-9]', '', 'g') LIKE ${digitsLike}`,
          );
        }
        const orClause = orParts.reduce((acc, part, i) =>
          i === 0 ? part : Prisma.sql`${acc} OR ${part}`,
        );
        conditions.push(Prisma.sql`(${orClause})`);
      }

      if (temFiltroQuitados) {
        conditions.push(Prisma.sql`EXISTS (
          SELECT 1 FROM carne c
          WHERE c.participante_id = p.id
            AND c.campanha_id::text = ${campanhaId}
            AND NOT EXISTS (
              SELECT 1 FROM parcela pa
              WHERE pa.carne_id = c.id AND pa.status = 'pendente'
            )
            AND EXISTS (
              SELECT 1 FROM parcela pa WHERE pa.carne_id = c.id
            )
        )`);
      }

      const where = conditions.reduce((acc, cond, i) =>
        i === 0 ? cond : Prisma.sql`${acc} AND ${cond}`,
      );

      return this.prisma.$queryRaw<any[]>(
        Prisma.sql`SELECT * FROM participante p WHERE ${where} ORDER BY p.nome ASC`,
      );
    }

    return this.prisma.participante.findMany({ orderBy: { nome: 'asc' } });
  }

  async buscar(id: string) {
    const p = await this.prisma.participante.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Participante não encontrado');
    return p;
  }

  async criar(dto: CriarParticipanteDto) {
    if (dto.cpf) {
      const existe = await this.prisma.participante.findUnique({
        where: { cpf: dto.cpf },
      });
      if (existe) throw new ConflictException('CPF já cadastrado');
    }
    return this.prisma.participante.create({ data: dto });
  }

  async atualizar(id: string, dto: AtualizarParticipanteDto) {
    await this.buscar(id);
    if (dto.cpf) {
      const existe = await this.prisma.participante.findFirst({
        where: { cpf: dto.cpf, NOT: { id } },
      });
      if (existe) throw new ConflictException('CPF já cadastrado');
    }
    return this.prisma.participante.update({ where: { id }, data: dto });
  }
}
