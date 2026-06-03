import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ApiService } from '../shared/services/api.service';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';
import { ListaPdfService } from '../shared/services/lista-pdf.service';
import { BrlPipe } from '../shared/pipes/brl.pipe';
import { Inscricao, Participante } from '../shared/models';

interface FileiraAssentos {
  esquerda: number[];
  direita: number[];
}

@Component({
  selector: 'app-inscricoes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzPageHeaderModule,
    NzEmptyModule,
    NzTableModule,
    NzIconModule,
    NzCardModule,
    NzButtonModule,
    NzInputModule,
    NzDividerModule,
    NzSpinModule,
    NzTagModule,
    NzModalModule,
    NzToolTipModule,
    BrlPipe,
  ],
  styles: [`
    :host { display: block; }

    /* ── layout raiz ──────────────────────────────────── */
    .root {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      align-items: stretch;
      height: calc(100vh - 198px);
      overflow: hidden;
    }

    /* ── painel esquerdo (desktop) ────────────────────── */
    .search-wrap { padding: 0 0 10px; }
    .participante-row { cursor: pointer; transition: background 0.15s; }
    .participante-row:hover td { background: #f5f5f5 !important; }
    .participante-row.ativo td { background: #e6f7ff !important; }
    .part-list-mobile { display: none; }

    /* ── painel direito ───────────────────────────────── */
    .right-col { display: flex; flex-direction: column; overflow: hidden; gap: 12px; }

    /* ── perfil ───────────────────────────────────────── */
    .perfil {
      flex-shrink: 0; display: flex; align-items: center; gap: 14px;
      padding: 14px 18px; background: #fafafa;
      border: 1px solid #f0f0f0; border-radius: 8px;
    }
    .avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: #1890ff; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 600; flex-shrink: 0;
    }
    .perfil-info { flex: 1; min-width: 0; }
    .perfil-info h3 { margin: 0; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .perfil-info p  { margin: 2px 0 0; font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .perfil-actions { flex-shrink: 0; }

    /* ── conteúdo: inscrições + mapa ──────────────────── */
    .conteudo { display: grid; grid-template-columns: 280px 1fr; gap: 12px; flex: 1; min-height: 0; overflow: hidden; }

    /* ── lista de inscrições do participante ──────────── */
    .insc-card {
      border: 1.5px solid #d9d9d9; border-radius: 8px;
      padding: 10px 12px; margin-bottom: 8px;
      cursor: pointer; transition: all 0.15s; background: #fff;
    }
    .insc-card:hover { border-color: #1890ff; }
    .insc-card.ativa { border-color: #1890ff; background: #e6f7ff; }
    .insc-card.quitada { border-left: 3px solid #52c41a; }
    .insc-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .insc-assento { font-size: 14px; font-weight: 700; color: #1a1a1a; }
    .insc-assento.sem { color: #aaa; font-weight: 500; }
    .insc-sub { font-size: 12px; color: #888; margin-top: 3px; }

    /* ── mapa de assentos ─────────────────────────────── */
    .mapa-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
    .mapa-legenda {
      display: flex; gap: 14px; flex-wrap: wrap;
      padding: 4px 0 10px; flex-shrink: 0; font-size: 12px; color: #666;
    }
    .leg-item { display: flex; align-items: center; gap: 5px; }
    .leg-box { width: 16px; height: 16px; border-radius: 4px; border: 1px solid #d9d9d9; }
    .leg-box.livre { background: #fff; }
    .leg-box.ocupado { background: #f5f5f5; border-color: #e8e8e8; }
    .leg-box.selecao { background: #1890ff; border-color: #1890ff; }

    .onibus {
      flex: 1; min-height: 0; overflow-y: auto;
      border: 1px solid #f0f0f0; border-radius: 12px;
      padding: 14px; background: #fafafa;
    }
    .frente {
      text-align: center; font-size: 11px; color: #aaa;
      text-transform: uppercase; letter-spacing: 1px;
      padding-bottom: 10px; border-bottom: 1px dashed #e0e0e0; margin-bottom: 12px;
    }
    .fileira {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 8px; justify-content: center;
    }
    .lado { display: flex; gap: 6px; }
    .corredor { width: 22px; flex-shrink: 0; }

    .assento {
      width: 44px; height: 40px; border-radius: 8px;
      border: 1.5px solid #d9d9d9; background: #fff;
      font-size: 12px; font-weight: 600; color: #555;
      cursor: pointer; transition: all 0.12s;
      display: flex; align-items: center; justify-content: center;
    }
    .assento.livre:hover { border-color: #1890ff; color: #1890ff; }
    .assento.ocupado {
      background: #f5f5f5; color: #bbb; border-color: #e8e8e8;
      cursor: pointer;
    }
    .assento.ocupado:hover { border-color: #faad14; color: #faad14; }
    .assento.meu {
      background: #1890ff; color: #fff; border-color: #1890ff;
      box-shadow: 0 2px 8px rgba(24,144,255,0.4);
    }
    .assento.desabilitado { opacity: 0.5; cursor: not-allowed; }

    /* ── empty state ──────────────────────────────────── */
    .empty-center { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: #bbb; }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-txt  { font-size: 15px; }

    /* ── mobile back bar ──────────────────────────────── */
    .mobile-back {
      display: none; align-items: center; gap: 10px;
      flex-wrap: wrap;
      padding: 10px 0 14px;
    }
    .mobile-back .nome { font-weight: 600; font-size: 16px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── mobile participant list items ────────────────── */
    .part-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 4px; border-bottom: 1px solid #f5f5f5;
      cursor: pointer; transition: background 0.12s; border-radius: 6px;
    }
    .part-item:active { background: #f0f7ff; }
    .part-item.ativo  { background: #e6f7ff; }
    .part-item .pi-avatar {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #1890ff, #096dd9);
      color: #fff; font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
    }
    .part-item .pi-info { flex: 1; min-width: 0; }
    .part-item .pi-nome { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .part-item .pi-rg   { font-size: 12px; color: #aaa; margin-top: 1px; }
    .part-item .pi-arrow { color: #d9d9d9; font-size: 12px; flex-shrink: 0; }

    /* ── mobile overrides ─────────────────────────────── */
    @media (max-width: 1024px) {
      .root      { grid-template-columns: 1fr; height: auto; overflow: visible; }
      .right-col { overflow: visible; gap: 12px; }
      .conteudo  { grid-template-columns: 1fr; overflow: visible; gap: 12px; }

      /* step navigation */
      .painel-left.tem-participante { display: none; }
      .painel-right { display: none; }
      .painel-right.tem-participante {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 54px;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 50;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        background: #fff;
        padding: 54px 12px calc(20px + env(safe-area-inset-bottom, 0px));
      }

      /* participant list */
      .part-table-wrap  { display: none; }
      .part-list-mobile { display: block; }
      .search-wrap      { padding-bottom: 4px; }

      /* hide desktop-only */
      .perfil      { display: none; }

      /* ── mobile back bar: fixed below app topbar ── */
      .mobile-back {
        display: flex;
        position: fixed;
        top: 54px; left: 0; right: 0;
        z-index: 99;
        background: #fff;
        border-bottom: 1px solid #f0f0f0;
        padding: 10px 12px;
      }
      .mobile-back .nome { font-size: 15px; font-weight: 600; }

      .onibus { max-height: none; }
      .assento { width: 48px; height: 46px; font-size: 13px; }
    }
  `],
  template: `
    <nz-page-header
      [nzTitle]="'Inscrições — ' + excursao.nome"
      [nzSubtitle]="(excursao.valor | brl) + ' · ' + excursao.numParcelas + 'x · ' + rotuloVeiculo + ' (' + excursao.totalAssentos + ' assentos)'">
      <nz-page-header-extra>
        <button nz-button
                [nzLoading]="exportandoMapa" (click)="exportarMapa()">
          <span nz-icon nzType="car"></span> Mapa em PDF
        </button>
        <button nz-button nzType="primary"
                [nzLoading]="exportando" (click)="exportarPdf()">
          <span nz-icon nzType="file-pdf"></span> Lista em PDF
        </button>
      </nz-page-header-extra>
    </nz-page-header>

    <div class="root">

      <!-- ═══════════════ PAINEL ESQUERDO ═══════════════ -->
      <nz-card nzSize="small" nzTitle="Participantes" style="overflow:auto"
               class="painel-left" [class.tem-participante]="!!participanteId">

        <!-- Busca -->
        <div class="search-wrap">
          <nz-input-group [nzSuffix]="icBusca">
            <input nz-input [(ngModel)]="busca" [ngModelOptions]="{standalone:true}"
                   placeholder="Nome, CPF ou telefone" (input)="onBuscaInput($event)" />
          </nz-input-group>
          <ng-template #icBusca><span nz-icon nzType="search"></span></ng-template>
        </div>

        <!-- Tabela (desktop) -->
        <div class="part-table-wrap">
          <nz-table #tbPart [nzData]="participantes" [nzLoading]="buscandoParticipante"
                    nzSize="small" [nzShowPagination]="participantes.length > 10"
                    [nzPageSize]="10" [nzNoResult]="semPart">
            <thead><tr>
              <th>Nome</th>
              <th nzWidth="90px" style="color:#aaa">RG</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let p of tbPart.data" class="participante-row"
                  [class.ativo]="p.id === participanteId" (click)="selecionarParticipante(p)">
                <td>{{ p.nome }}</td>
                <td style="font-size:11px; color:#aaa">{{ p.rg || '—' }}</td>
              </tr>
            </tbody>
          </nz-table>
        </div>

        <!-- Lista touch (mobile) -->
        <div class="part-list-mobile">
          <nz-spin *ngIf="buscandoParticipante" style="display:block;text-align:center;padding:32px" />
          <ng-container *ngIf="!buscandoParticipante">
            <p *ngIf="participantes.length === 0"
               style="text-align:center;color:#ccc;padding:24px 0;font-size:13px">Nenhum resultado</p>
            <div *ngFor="let p of participantes" class="part-item"
                 [class.ativo]="p.id === participanteId"
                 role="button" tabindex="0"
                 (click)="selecionarParticipante(p)"
                 (keydown.enter)="selecionarParticipante(p)"
                 (keydown.space)="$event.preventDefault(); selecionarParticipante(p)">
              <div class="pi-avatar">{{ iniciaisParticipante(p) }}</div>
              <div class="pi-info">
                <div class="pi-nome">{{ p.nome }}</div>
                <div class="pi-rg" *ngIf="p.rg">{{ p.rg }}</div>
              </div>
              <span nz-icon nzType="right" class="pi-arrow"></span>
            </div>
          </ng-container>
        </div>

        <ng-template #semPart>
          <p style="text-align:center;color:#ccc;padding:16px 0;font-size:13px">Nenhum resultado</p>
        </ng-template>
      </nz-card>

      <!-- ═══════════════ PAINEL DIREITO ═══════════════ -->
      <div class="right-col painel-right" [class.tem-participante]="!!participanteId">

        <!-- Header mobile -->
        <div class="mobile-back" *ngIf="participanteId">
          <button nz-button nzType="text" (click)="deselecionar()"
                  style="padding:0 4px; margin-right:2px; flex-shrink:0">
            <span nz-icon nzType="arrow-left" style="font-size:18px"></span>
          </button>
          <div class="nome">{{ participanteSelecionado?.nome }}</div>
        </div>

        <!-- Nenhum participante selecionado -->
        <div *ngIf="!participanteId" class="empty-center">
          <span class="empty-icon" nz-icon nzType="user" nzTheme="outline"></span>
          <p class="empty-txt">Selecione um participante à esquerda</p>
        </div>

        <!-- Participante selecionado -->
        <ng-container *ngIf="participanteId">

          <!-- Perfil (desktop only) -->
          <div class="perfil">
            <div class="avatar">{{ iniciais }}</div>
            <div class="perfil-info">
              <h3>{{ participanteSelecionado?.nome }}</h3>
              <p>{{ participanteSelecionado?.telefone || participanteSelecionado?.cpf || 'Sem contato' }}</p>
            </div>
            <div class="perfil-actions">
              <button nz-button nzType="primary" nzSize="small"
                      [nzLoading]="inscrevendo"
                      [disabled]="jaInscrito"
                      [nz-tooltip]="jaInscrito ? 'Já inscrito nesta excursão' : null"
                      (click)="inscrever()">
                <span nz-icon nzType="plus"></span>
                {{ jaInscrito ? 'Já inscrito' : 'Inscrever' }}
              </button>
            </div>
          </div>

          <!-- Botão inscrever (mobile) -->
          <div class="part-list-mobile">
            <button nz-button nzType="primary" nzBlock
                    [nzLoading]="inscrevendo"
                    [disabled]="jaInscrito"
                    (click)="inscrever()">
              <span nz-icon nzType="plus"></span>
              {{ jaInscrito ? 'Já inscrito nesta excursão' : 'Inscrever participante' }}
            </button>
          </div>

          <nz-spin *ngIf="carregando" nzTip="Carregando..." style="display:block;text-align:center;padding:40px" />

          <div *ngIf="!carregando" class="conteudo">

            <!-- INSCRIÇÕES DO PARTICIPANTE -->
            <nz-card nzSize="small" nzTitle="Inscrições do participante"
                     style="height:100%; display:flex; flex-direction:column; overflow:hidden"
                     [nzBodyStyle]="{ 'flex': '1', 'min-height': '0', 'overflow-y': 'auto', 'padding': '12px' }">
              <nz-empty *ngIf="inscricoesParticipante.length === 0"
                nzNotFoundContent="Nenhuma inscrição. Clique em Inscrever." />

              <div *ngFor="let i of inscricoesParticipante" class="insc-card"
                   [class.ativa]="i.id === inscricaoSelecionadaId"
                   [class.quitada]="i.quitado"
                   role="button" tabindex="0"
                   (click)="selecionarInscricao(i)"
                   (keydown.enter)="selecionarInscricao(i)"
                   (keydown.space)="$event.preventDefault(); selecionarInscricao(i)">
                <div class="insc-top">
                  <span class="insc-assento" [class.sem]="!temAssento(i)">
                    <ng-container *ngIf="temAssento(i)">Assento {{ i.numeroAssento }}</ng-container>
                    <ng-container *ngIf="!temAssento(i)">Sem assento</ng-container>
                  </span>
                  <nz-tag nzSize="small" [nzColor]="i.quitado ? 'success' : 'default'" style="margin:0;font-size:10px">
                    {{ i.quitado ? 'Quitado' : 'Pendente' }}
                  </nz-tag>
                </div>
                <div class="insc-sub">
                  {{ i.id === inscricaoSelecionadaId ? 'Selecione um assento no mapa →' : 'Clique para atribuir assento' }}
                </div>
              </div>
            </nz-card>

            <!-- MAPA DE ASSENTOS -->
            <nz-card nzSize="small" [nzTitle]="'Mapa de assentos — ' + rotuloVeiculo"
                     style="height:100%; display:flex; flex-direction:column; overflow:hidden"
                     [nzBodyStyle]="{ 'flex': '1', 'min-height': '0', 'overflow': 'hidden', 'display': 'flex', 'flex-direction': 'column', 'padding': '12px' }">

              <div class="mapa-wrap">
                <div class="mapa-legenda">
                  <span class="leg-item"><span class="leg-box livre"></span> Livre</span>
                  <span class="leg-item"><span class="leg-box ocupado"></span> Ocupado</span>
                  <span class="leg-item"><span class="leg-box selecao"></span> Inscrição atual</span>
                </div>

                <div *ngIf="!inscricaoSelecionadaId"
                     style="font-size:12px; color:#fa8c16; padding-bottom:8px; flex-shrink:0">
                  <span nz-icon nzType="warning" style="margin-right:4px"></span>
                  Selecione uma inscrição à esquerda para atribuir um assento.
                </div>

                <div class="onibus">
                  <div class="frente">Frente</div>
                  <div *ngFor="let f of fileiras" class="fileira">
                    <div class="lado">
                      <button *ngFor="let n of f.esquerda" class="assento"
                        [class.livre]="!ocupados.has(n) && n !== assentoDaInscricao"
                        [class.ocupado]="ocupados.has(n) && n !== assentoDaInscricao"
                        [class.meu]="n === assentoDaInscricao"
                        [class.desabilitado]="!podeClicarAssento(n)"
                        [disabled]="!podeClicarAssento(n)"
                        [nz-tooltip]="tooltipAssento(n)"
                        (click)="clicarAssento(n)">
                        {{ n }}
                      </button>
                    </div>
                    <div class="corredor"></div>
                    <div class="lado">
                      <button *ngFor="let n of f.direita" class="assento"
                        [class.livre]="!ocupados.has(n) && n !== assentoDaInscricao"
                        [class.ocupado]="ocupados.has(n) && n !== assentoDaInscricao"
                        [class.meu]="n === assentoDaInscricao"
                        [class.desabilitado]="!podeClicarAssento(n)"
                        [disabled]="!podeClicarAssento(n)"
                        [nz-tooltip]="tooltipAssento(n)"
                        (click)="clicarAssento(n)">
                        {{ n }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </nz-card>

          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class InscricoesComponent implements OnInit {
  excursaoAtiva = inject(ExcursaoAtivaService);
  private listaPdf = inject(ListaPdfService);

  get excursao() { return this.excursaoAtiva.excursao()!; }
  get rotuloVeiculo(): string { return this.excursao.tipoVeiculo === 'van' ? 'Van' : 'Ônibus'; }

  fileiras: FileiraAssentos[] = [];
  /** assento → inscrição que o ocupa (id + nome do participante). */
  ocupados = new Map<number, { id: string; nome: string }>();

  participantes: Participante[] = [];
  participanteId: string | null = null;
  participanteSelecionado: Participante | null = null;
  busca = '';

  inscricoesParticipante: Inscricao[] = [];
  inscricaoSelecionadaId: string | null = null;

  /** True se o participante selecionado já tem uma inscrição ativa nesta excursão. */
  get jaInscrito(): boolean {
    return this.inscricoesParticipante.some((i) => i.status !== 'cancelada');
  }

  carregando = false;
  buscandoParticipante = false;
  inscrevendo = false;
  exportando = false;
  exportandoMapa = false;

  private buscaSubject = new Subject<string>();

  constructor(
    private api: ApiService,
    private message: NzMessageService,
    private modal: NzModalService,
  ) {}

  ngOnInit() {
    this.montarFileiras();
    this.carregarMapa();
    this.carregarParticipantes();

    this.buscaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(busca => {
        this.buscandoParticipante = true;
        return this.api.get<Participante[]>('participantes', busca ? { busca } : undefined);
      }),
    ).subscribe({
      next: (data) => { this.participantes = data; this.buscandoParticipante = false; },
      error: () => { this.buscandoParticipante = false; },
    });
  }

  // ── Montagem do mapa ──
  montarFileiras() {
    const total = this.excursao.totalAssentos;
    const porFileira = this.excursao.tipoVeiculo === 'van' ? 3 : 4;
    const esqCount = this.excursao.tipoVeiculo === 'van' ? 1 : 2;
    this.fileiras = [];
    let n = 1;
    while (n <= total) {
      const fileira: FileiraAssentos = { esquerda: [], direita: [] };
      for (let i = 0; i < porFileira && n <= total; i++) {
        if (i < esqCount) fileira.esquerda.push(n);
        else fileira.direita.push(n);
        n++;
      }
      this.fileiras.push(fileira);
    }
  }

  carregarMapa() {
    this.carregando = true;
    this.api.get<Inscricao[]>('inscricoes', { excursaoId: this.excursao.id }).subscribe({
      next: (inscricoes) => {
        this.ocupados.clear();
        inscricoes.forEach(i => {
          if (i.numeroAssento != null) {
            this.ocupados.set(i.numeroAssento, {
              id: i.id,
              nome: i.participante?.nome ?? 'Ocupado',
            });
          }
        });
        this.carregando = false;
      },
      error: () => { this.carregando = false; },
    });
  }

  // ── Participantes ──
  carregarParticipantes() {
    this.buscandoParticipante = true;
    this.api.get<Participante[]>('participantes').subscribe({
      next: (data) => { this.participantes = data; this.buscandoParticipante = false; },
      error: () => { this.buscandoParticipante = false; },
    });
  }

  onBuscaInput(event: Event) {
    this.busca = (event.target as HTMLInputElement).value;
    this.buscaSubject.next(this.busca);
  }

  selecionarParticipante(p: Participante) {
    if (p.id === this.participanteId) return;
    this.participanteId = p.id;
    this.participanteSelecionado = p;
    this.inscricaoSelecionadaId = null;
    this.carregarInscricoesParticipante();
  }

  deselecionar() {
    this.participanteId = null;
    this.participanteSelecionado = null;
    this.inscricoesParticipante = [];
    this.inscricaoSelecionadaId = null;
  }

  carregarInscricoesParticipante() {
    if (!this.participanteId) return;
    this.api.get<Inscricao[]>('inscricoes/participante', {
      excursaoId: this.excursao.id,
      participanteId: this.participanteId,
    }).subscribe({
      next: (data) => {
        this.inscricoesParticipante = data;
        const semAssento = data.find(i => i.numeroAssento == null);
        this.inscricaoSelecionadaId = (semAssento ?? data[0])?.id ?? null;
      },
      error: () => { this.inscricoesParticipante = []; },
    });
  }

  selecionarInscricao(i: Inscricao) {
    this.inscricaoSelecionadaId = i.id;
  }

  temAssento(i: Inscricao): boolean {
    return i.numeroAssento !== null && i.numeroAssento !== undefined;
  }

  get inscricaoSelecionada(): Inscricao | null {
    return this.inscricoesParticipante.find(i => i.id === this.inscricaoSelecionadaId) ?? null;
  }

  get assentoDaInscricao(): number | null {
    return this.inscricaoSelecionada?.numeroAssento ?? null;
  }

  // ── Inscrever ──
  inscrever() {
    if (!this.participanteId || this.jaInscrito) return;
    this.inscrevendo = true;
    this.api.post<Inscricao>('inscricoes/inscrever', {
      excursaoId: this.excursao.id,
      participanteId: this.participanteId,
    }).subscribe({
      next: () => {
        this.message.success('Inscrição criada!');
        this.inscrevendo = false;
        this.carregarInscricoesParticipante();
        this.carregarMapa();
      },
      error: (err) => {
        this.message.error(err?.error?.message ?? 'Erro ao inscrever');
        this.inscrevendo = false;
      },
    });
  }

  // ── Assentos ──
  podeClicarAssento(n: number): boolean {
    if (!this.inscricaoSelecionadaId) return false;
    // Tudo clicável quando há inscrição selecionada:
    // - próprio → libera   - livre → atribui   - de outro → abre confirmação de troca
    if (n === this.assentoDaInscricao) return true;
    const ocupante = this.ocupados.get(n);
    if (ocupante) return ocupante.id !== this.inscricaoSelecionadaId;
    return true;
  }

  tooltipAssento(n: number): string | null {
    if (n === this.assentoDaInscricao) return 'Assento atual — clique para liberar';
    const ocupante = this.ocupados.get(n);
    if (ocupante) return `${ocupante.nome} — clique para trocar`;
    return null;
  }

  clicarAssento(n: number) {
    if (!this.inscricaoSelecionadaId) {
      this.message.warning('Selecione uma inscrição primeiro.');
      return;
    }
    const limpar = n === this.assentoDaInscricao;
    if (limpar) {
      this.atribuirAssento(null);
      return;
    }
    const ocupante = this.ocupados.get(n);
    if (ocupante && ocupante.id !== this.inscricaoSelecionadaId) {
      this.confirmarTroca(ocupante, n);
      return;
    }
    this.atribuirAssento(n);
  }

  private atribuirAssento(numeroAssento: number | null) {
    this.api.patch<Inscricao>(
      `inscricoes/${this.inscricaoSelecionadaId}/assento`,
      { numeroAssento },
    ).subscribe({
      next: () => {
        this.message.success(
          numeroAssento === null
            ? 'Assento liberado.'
            : `Assento ${numeroAssento} atribuído.`,
        );
        this.carregarInscricoesParticipante();
        this.carregarMapa();
      },
      error: (err) => {
        this.message.error(err?.error?.message ?? 'Erro ao atribuir assento');
      },
    });
  }

  private confirmarTroca(ocupante: { id: string; nome: string }, n: number) {
    const meu = this.assentoDaInscricao;
    const nomeSel = this.participanteSelecionado?.nome ?? 'Participante';
    const detalhe = meu != null
      ? `${nomeSel} ficará com o assento ${n} e ${ocupante.nome} ficará com o assento ${meu}.`
      : `${nomeSel} ficará com o assento ${n} e ${ocupante.nome} ficará sem assento.`;
    this.modal.confirm({
      nzTitle: `Trocar os lugares entre ${nomeSel} e ${ocupante.nome}?`,
      nzContent: detalhe,
      nzOkText: 'Trocar',
      nzCancelText: 'Cancelar',
      nzOnOk: () => this.executarTroca(ocupante.id),
    });
  }

  private executarTroca(outraInscricaoId: string) {
    this.api.post<Inscricao>('inscricoes/trocar-assentos', {
      inscricaoAId: this.inscricaoSelecionadaId,
      inscricaoBId: outraInscricaoId,
    }).subscribe({
      next: () => {
        this.message.success('Lugares trocados.');
        this.carregarInscricoesParticipante();
        this.carregarMapa();
      },
      error: (err) => {
        this.message.error(err?.error?.message ?? 'Erro ao trocar lugares');
      },
    });
  }

  // ── Exportar PDF ──
  exportarPdf() {
    this.exportando = true;
    this.api.get<Inscricao[]>('inscricoes', { excursaoId: this.excursao.id }).subscribe({
      next: (inscricoes) => {
        const ativas = inscricoes.filter((i) => i.status !== 'cancelada');
        if (ativas.length === 0) {
          this.message.info('Nenhuma inscrição para exportar.');
          this.exportando = false;
          return;
        }
        this.listaPdf.gerarListaPassageiros(this.excursao, inscricoes);
        this.exportando = false;
      },
      error: () => {
        this.message.error('Erro ao gerar o PDF.');
        this.exportando = false;
      },
    });
  }

  exportarMapa() {
    this.exportandoMapa = true;
    this.api.get<Inscricao[]>('inscricoes', { excursaoId: this.excursao.id }).subscribe({
      next: (inscricoes) => {
        this.listaPdf.gerarMapaAssentos(this.excursao, inscricoes);
        this.exportandoMapa = false;
      },
      error: () => {
        this.message.error('Erro ao gerar o mapa.');
        this.exportandoMapa = false;
      },
    });
  }

  // ── Helpers ──
  get iniciais(): string {
    return this.iniciaisParticipante(this.participanteSelecionado);
  }

  iniciaisParticipante(p: Participante | null): string {
    const nome: string = p?.nome ?? '';
    return nome.split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase();
  }
}
