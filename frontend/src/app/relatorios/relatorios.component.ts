import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { ApiService } from '../shared/services/api.service';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';
import { BrlPipe } from '../shared/pipes/brl.pipe';
import { ExcursaoStatus, TipoVeiculo } from '../shared/models';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule,
    NzPageHeaderModule,
    NzSpinModule,
    NzIconModule,
    NzTagModule,
    NzDividerModule,
    BrlPipe,
  ],
  styles: [`
    /* ── stats grid ────────────────────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: #fff;
      border-radius: 12px;
      padding: 20px 22px 16px;
      border: 1px solid #f0f0f0;
      box-shadow: 0 1px 4px rgba(0,0,0,.04);
      transition: box-shadow .2s, transform .2s;
      position: relative;
      overflow: hidden;
    }
    .stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-1px); }
    .stat-card::before {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
    }
    .stat-card.azul::before    { background: #1890ff; }
    .stat-card.verde::before   { background: #52c41a; }
    .stat-card.laranja::before { background: #fa8c16; }
    .stat-card.roxo::before    { background: #722ed1; }

    .stat-top  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .stat-val  { font-size: 30px; font-weight: 700; line-height: 1; color: #1a1a1a; }
    .stat-lbl  { font-size: 13px; color: #666; margin-top: 4px; font-weight: 500; }
    .stat-sub  { font-size: 12px; color: #bbb; margin-top: 3px; }
    .stat-mini-bar  { height: 4px; background: #f0f0f0; border-radius: 2px; margin-top: 14px; overflow: hidden; }
    .stat-mini-fill { height: 4px; border-radius: 2px; transition: width .6s ease; }

    /* ── sections ──────────────────────────────────── */
    .section {
      background: #fff; border-radius: 10px;
      border: 1px solid #f0f0f0; padding: 20px 24px; margin-bottom: 14px;
    }
    .section-title { font-weight: 600; font-size: 15px; margin-bottom: 16px; color: #1a1a1a; }

    /* ── progress ──────────────────────────────────── */
    .prog-row   { margin-bottom: 14px; }
    .prog-label { display: flex; justify-content: space-between; font-size: 13px; color: #555; margin-bottom: 6px; }
    .prog-bar   { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .prog-fill  { height: 8px; border-radius: 4px; transition: width 0.5s; }

    /* ── info rows ─────────────────────────────────── */
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-key { color: #888; }
    .info-val { font-weight: 500; color: #1a1a1a; }

    /* ══════════════════════════════════════════════════
       MOBILE
    ══════════════════════════════════════════════════ */
    @media (max-width: 1024px) {

      /* ── stats grid 2×2 ── */
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }

      .stat-card { padding: 14px 14px 12px; border-radius: 14px; }
      .stat-icon { width: 36px; height: 36px; font-size: 16px; border-radius: 8px; }
      .stat-top  { margin-bottom: 10px; }
      .stat-val  { font-size: 26px; }
      .stat-lbl  { font-size: 12px; }
      .stat-sub  { font-size: 11px; }
      .stat-mini-bar { margin-top: 10px; }

      /* card do valor — fonte menor para caber */
      .stat-card.roxo .stat-val { font-size: 18px; }

      /* ── sections ── */
      .section { padding: 14px 16px; margin-bottom: 10px; border-radius: 14px; }
      .section-title { font-size: 14px; margin-bottom: 12px; }

      /* ── progress ── */
      .prog-row   { margin-bottom: 12px; }
      .prog-label { font-size: 12px; }

      /* ── info rows ── */
      .info-row { font-size: 13px; padding: 9px 0; }
    }
  `],
  template: `
    <nz-page-header
      nzTitle="Relatórios"
      [nzSubtitle]="resumo ? resumo.excursao.nome : 'Carregando...'" />

    <nz-spin *ngIf="carregando" nzTip="Carregando relatório..."
             style="display:block; text-align:center; padding:60px" />

    <ng-container *ngIf="!carregando && resumo">

      <!-- Cards de métricas -->
      <div class="stats-grid">

        <div class="stat-card azul">
          <div class="stat-top">
            <div>
              <div class="stat-val">{{ resumo.totalInscricoes }}</div>
              <div class="stat-lbl">Inscrições</div>
              <div class="stat-sub">de {{ resumo.excursao.totalAssentos }} assentos</div>
            </div>
            <div class="stat-icon" style="background:#e6f7ff; color:#1890ff">
              <span nz-icon nzType="profile"></span>
            </div>
          </div>
          <div class="stat-mini-bar">
            <div class="stat-mini-fill" style="background:#1890ff"
                 [style.width.%]="pct(resumo.totalInscricoes, resumo.excursao.totalAssentos)"></div>
          </div>
        </div>

        <div class="stat-card verde">
          <div class="stat-top">
            <div>
              <div class="stat-val" style="color:#52c41a">{{ resumo.quitados }}</div>
              <div class="stat-lbl">Inscrições quitadas</div>
              <div class="stat-sub">totalmente pagas</div>
            </div>
            <div class="stat-icon" style="background:#f6ffed; color:#52c41a">
              <span nz-icon nzType="check-circle"></span>
            </div>
          </div>
          <div class="stat-mini-bar">
            <div class="stat-mini-fill" style="background:#52c41a"
                 [style.width.%]="pct(resumo.quitados, resumo.totalInscricoes)"></div>
          </div>
        </div>

        <div class="stat-card laranja">
          <div class="stat-top">
            <div>
              <div class="stat-val" style="color:#fa8c16">{{ resumo.pendentes }}</div>
              <div class="stat-lbl">Inscrições pendentes</div>
              <div class="stat-sub">com parcelas em aberto</div>
            </div>
            <div class="stat-icon" style="background:#fff7e6; color:#fa8c16">
              <span nz-icon nzType="clock-circle"></span>
            </div>
          </div>
          <div class="stat-mini-bar">
            <div class="stat-mini-fill" style="background:#fa8c16"
                 [style.width.%]="pct(resumo.pendentes, resumo.totalInscricoes)"></div>
          </div>
        </div>

        <div class="stat-card roxo">
          <div class="stat-top">
            <div>
              <div class="stat-val" style="color:#722ed1">{{ resumo.totalArrecadado | brl }}</div>
              <div class="stat-lbl">Total arrecadado</div>
              <div class="stat-sub">de {{ potencialTotal | brl }}</div>
            </div>
            <div class="stat-icon" style="background:#f9f0ff; color:#722ed1">
              <span nz-icon nzType="dollar"></span>
            </div>
          </div>
          <div class="stat-mini-bar">
            <div class="stat-mini-fill" style="background:#722ed1"
                 [style.width.%]="pct(resumo.totalArrecadado, potencialTotal)"></div>
          </div>
        </div>

      </div>

      <!-- Progresso -->
      <div class="section">
        <div class="section-title">Progresso da excursão</div>

        <div class="prog-row">
          <div class="prog-label">
            <span>Assentos ocupados</span>
            <span><strong>{{ resumo.comAssento }}</strong> / {{ resumo.excursao.totalAssentos }}
              ({{ pct(resumo.comAssento, resumo.excursao.totalAssentos) }}%)</span>
          </div>
          <div class="prog-bar">
            <div class="prog-fill" style="background:#1890ff"
                 [style.width.%]="pct(resumo.comAssento, resumo.excursao.totalAssentos)"></div>
          </div>
        </div>

        <div class="prog-row">
          <div class="prog-label">
            <span>Inscrições quitadas</span>
            <span><strong>{{ resumo.quitados }}</strong> / {{ resumo.totalInscricoes }}
              ({{ pct(resumo.quitados, resumo.totalInscricoes) }}%)</span>
          </div>
          <div class="prog-bar">
            <div class="prog-fill" style="background:#52c41a"
                 [style.width.%]="pct(resumo.quitados, resumo.totalInscricoes)"></div>
          </div>
        </div>

        <div class="prog-row" style="margin-bottom:0">
          <div class="prog-label">
            <span>Valor arrecadado</span>
            <span><strong>{{ resumo.totalArrecadado | brl }}</strong> / {{ potencialTotal | brl }}
              ({{ pct(resumo.totalArrecadado, potencialTotal) }}%)</span>
          </div>
          <div class="prog-bar">
            <div class="prog-fill" style="background:#722ed1"
                 [style.width.%]="pct(resumo.totalArrecadado, potencialTotal)"></div>
          </div>
        </div>
      </div>

      <!-- Detalhes da excursão -->
      <div class="section">
        <div class="section-title">Detalhes da excursão</div>
        <div class="info-row">
          <span class="info-key">Status</span>
          <nz-tag [nzColor]="resumo.excursao.status === 'aberta' ? 'success' : 'default'">
            {{ resumo.excursao.status === 'aberta' ? 'Aberta' : 'Encerrada' }}
          </nz-tag>
        </div>
        <div class="info-row">
          <span class="info-key">Destino</span>
          <span class="info-val">{{ resumo.excursao.destino }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Data de ida</span>
          <span class="info-val">{{ resumo.excursao.dataIda | date:'dd/MM/yyyy':'UTC' }}</span>
        </div>
        <div class="info-row" *ngIf="resumo.excursao.dataVolta">
          <span class="info-key">Data de volta</span>
          <span class="info-val">{{ resumo.excursao.dataVolta | date:'dd/MM/yyyy':'UTC' }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Veículo</span>
          <span class="info-val">{{ rotuloVeiculo(resumo.excursao.tipoVeiculo) }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Valor da inscrição</span>
          <span class="info-val">{{ resumo.excursao.valor | brl }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Nº de parcelas</span>
          <span class="info-val">{{ resumo.excursao.numParcelas }}x de {{ valorParcela | brl }}</span>
        </div>
        <div class="info-row">
          <span class="info-key">Assentos sem inscrição</span>
          <span class="info-val">{{ resumo.semAssento }} sem assento · {{ resumo.vagasDisponiveis }} vaga(s)</span>
        </div>
      </div>

    </ng-container>
  `,
})
export class RelatoriosComponent implements OnInit {
  excursaoAtiva = inject(ExcursaoAtivaService);

  resumo: ResumoExcursao | null = null;
  carregando = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    const excursaoId = this.excursaoAtiva.excursao()?.id;
    if (!excursaoId) { this.carregando = false; return; }
    this.api.get<ResumoExcursao>(`relatorios/excursao/${excursaoId}`).subscribe({
      next: (data) => { this.resumo = data; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  get potencialTotal(): number {
    if (!this.resumo) return 0;
    return Number(this.resumo.potencialTotal);
  }

  get valorParcela(): number {
    if (!this.resumo) return 0;
    return Number(this.resumo.excursao.valor) / this.resumo.excursao.numParcelas;
  }

  rotuloVeiculo(t: TipoVeiculo): string {
    return t === 'van' ? 'Van' : 'Ônibus';
  }

  pct(val: number | string, total: number): number {
    const n = Number(val);
    if (!total || total === 0) return 0;
    return Math.round((n / total) * 100);
  }
}

interface ResumoExcursao {
  excursao: {
    id: string;
    nome: string;
    destino: string;
    status: ExcursaoStatus;
    dataIda: string;
    dataVolta?: string | null;
    valor: number | string;
    numParcelas: number;
    tipoVeiculo: TipoVeiculo;
    totalAssentos: number;
  };
  totalInscricoes: number;
  vagasDisponiveis: number;
  comAssento: number;
  semAssento: number;
  quitados: number;
  pendentes: number;
  totalArrecadado: number | string;
  potencialTotal: number | string;
}
