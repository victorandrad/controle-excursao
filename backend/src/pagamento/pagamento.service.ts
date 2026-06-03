import {
  Injectable,
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarPagamentoDto, RegistrarPagamentoDto } from './pagamento.dto';
import { COMPROVANTES_DIR, mimeDoArquivo } from './comprovante.config';
import { Prisma } from '@prisma/client';
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
        // Lote único pra toda a operação — permite cancelar tudo junto depois.
        const loteId = randomUUID();
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
              loteId,
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

  async atualizar(
    id: string,
    dto: AtualizarPagamentoDto,
    novoComprovante?: Express.Multer.File,
  ) {
    try {
      const pagamento = await this.prisma.pagamento.findUnique({
        where: { id },
        include: {
          parcela: {
            include: { inscricao: { include: { excursao: true } } },
          },
        },
      });
      if (!pagamento) throw new NotFoundException('Pagamento não encontrado');

      const temComprovante = novoComprovante || pagamento.comprovante;
      if (dto.metodo === 'pix' && !temComprovante) {
        throw new BadRequestException(
          'Comprovante obrigatório para pagamento Pix',
        );
      }

      const valorParcela =
        Number(pagamento.parcela.inscricao.excursao.valor) /
        pagamento.parcela.inscricao.excursao.numParcelas;
      const comprovanteAntigo = pagamento.comprovante;
      const comprovanteNovo = novoComprovante?.filename;

      const atualizado = await this.prisma.$transaction(async (tx) => {
        const upd = await tx.pagamento.update({
          where: { id },
          data: {
            valorPago: new Decimal(dto.valorPago),
            dataPagamento: new Date(dto.dataPagamento),
            metodo: dto.metodo,
            referencia: dto.referencia ?? null,
            ...(comprovanteNovo ? { comprovante: comprovanteNovo } : {}),
          },
        });

        // Recomputa status da parcela com base na soma dos pagamentos.
        const pgs = await tx.pagamento.findMany({
          where: { parcelaId: pagamento.parcelaId },
        });
        const soma = pgs.reduce((acc, p) => acc + Number(p.valorPago), 0);
        await tx.parcela.update({
          where: { id: pagamento.parcelaId },
          data: { status: soma + 0.005 >= valorParcela ? 'paga' : 'pendente' },
        });

        // Se substituímos o comprovante e o antigo não é mais usado, apaga.
        if (
          comprovanteNovo &&
          comprovanteAntigo &&
          comprovanteAntigo !== comprovanteNovo
        ) {
          const aindaUsado = await tx.pagamento.count({
            where: { comprovante: comprovanteAntigo },
          });
          if (aindaUsado === 0) this.removerArquivo(comprovanteAntigo);
        }
        return upd;
      });

      return atualizado;
    } catch (err) {
      if (novoComprovante) this.removerArquivo(novoComprovante.filename);
      throw err;
    }
  }

  async cancelar(id: string) {
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { id },
      include: {
        parcela: {
          include: { inscricao: { include: { excursao: true } } },
        },
      },
    });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado');

    const inscricaoId = pagamento.parcela.inscricaoId;
    const valorParcela =
      Number(pagamento.parcela.inscricao.excursao.valor) /
      pagamento.parcela.inscricao.excursao.numParcelas;

    // Pagamentos a cancelar: se houver loteId, todos do lote (mesma inscrição).
    // Senão, apenas este.
    const aCancelar = pagamento.loteId
      ? await this.prisma.pagamento.findMany({
          where: {
            loteId: pagamento.loteId,
            parcela: { inscricaoId },
          },
          select: { id: true, parcelaId: true, comprovante: true },
        })
      : [
          {
            id: pagamento.id,
            parcelaId: pagamento.parcelaId,
            comprovante: pagamento.comprovante,
          },
        ];

    const ids = aCancelar.map((p) => p.id);
    const parcelaIds = [...new Set(aCancelar.map((p) => p.parcelaId))];
    const arquivos = [
      ...new Set(
        aCancelar.map((p) => p.comprovante).filter((c): c is string => !!c),
      ),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.pagamento.deleteMany({ where: { id: { in: ids } } });

      // Recompõe status de cada parcela afetada (sem redistribuir entre parcelas).
      for (const pid of parcelaIds) {
        const restantes = await tx.pagamento.findMany({
          where: { parcelaId: pid },
        });
        const soma = restantes.reduce((acc, p) => acc + Number(p.valorPago), 0);
        await tx.parcela.update({
          where: { id: pid },
          data: { status: soma + 0.005 >= valorParcela ? 'paga' : 'pendente' },
        });
      }

      // Limpa arquivos de comprovante que não são mais referenciados.
      for (const arq of arquivos) {
        const aindaUsado = await tx.pagamento.count({
          where: { comprovante: arq },
        });
        if (aindaUsado === 0) this.removerArquivo(arq);
      }
    });

    return { ok: true, cancelados: ids.length };
  }

  /**
   * Dispara a redistribuição automática numa inscrição existente — útil pra
   * "consertar" inscrições com pagamentos antigos mal-distribuídos.
   */
  async redistribuirManual(inscricaoId: string) {
    const inscricao = await this.prisma.inscricao.findUnique({
      where: { id: inscricaoId },
      include: { excursao: true },
    });
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada');
    const valorParcela =
      Number(inscricao.excursao.valor) / inscricao.excursao.numParcelas;
    await this.prisma.$transaction(async (tx) => {
      await this.redistribuirInscricao(tx, inscricaoId, valorParcela);
    });
    return { ok: true };
  }

  /**
   * Redistribui automaticamente os pagamentos restantes da inscrição:
   *  - Percorre pagamentos em ordem de criação.
   *  - Enche cada parcela em ordem; quando um pagamento não cabe inteiro na
   *    parcela atual, divide em dois registros (mesma data/método/comprovante)
   *    pra encher a parcela e empurrar o resto pra próxima.
   *  - Recalcula `status` de todas as parcelas.
   */
  private async redistribuirInscricao(
    tx: Prisma.TransactionClient,
    inscricaoId: string,
    valorParcela: number,
  ) {
    const remaining = await tx.pagamento.findMany({
      where: { parcela: { inscricaoId } },
      orderBy: { criadoEm: 'asc' },
    });
    const parcelas = await tx.parcela.findMany({
      where: { inscricaoId },
      orderBy: { numero: 'asc' },
    });
    if (parcelas.length === 0) return;

    let pIdx = 0;
    let acumulado = 0;

    for (const pg of remaining) {
      let restanteDoPg = Number(pg.valorPago);
      let primeiroChunk = true;

      while (restanteDoPg > 0.005 && pIdx < parcelas.length) {
        const capacidade = Math.max(0, valorParcela - acumulado);
        if (capacidade < 0.005) {
          pIdx++;
          acumulado = 0;
          continue;
        }
        const chunk = round2(Math.min(restanteDoPg, capacidade));

        if (primeiroChunk) {
          // Reaproveita o registro original (atualizando parcela + valor).
          await tx.pagamento.update({
            where: { id: pg.id },
            data: {
              parcelaId: parcelas[pIdx].id,
              valorPago: new Decimal(chunk),
            },
          });
          primeiroChunk = false;
        } else {
          // Chunks subsequentes: cria novo registro herdando metadados (loteId inclusive).
          await tx.pagamento.create({
            data: {
              parcelaId: parcelas[pIdx].id,
              usuarioId: pg.usuarioId,
              valorPago: new Decimal(chunk),
              dataPagamento: pg.dataPagamento,
              criadoEm: pg.criadoEm,
              metodo: pg.metodo,
              referencia: pg.referencia,
              comprovante: pg.comprovante,
              loteId: pg.loteId,
            },
          });
        }
        acumulado = round2(acumulado + chunk);
        restanteDoPg = round2(restanteDoPg - chunk);
      }
    }

    // Recomputa status com base nas novas atribuições.
    for (const par of parcelas) {
      const pgs = await tx.pagamento.findMany({
        where: { parcelaId: par.id },
      });
      const soma = pgs.reduce((acc, p) => acc + Number(p.valorPago), 0);
      const novoStatus = soma + 0.005 >= valorParcela ? 'paga' : 'pendente';
      if (par.status !== novoStatus) {
        await tx.parcela.update({
          where: { id: par.id },
          data: { status: novoStatus },
        });
      }
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
