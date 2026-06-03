import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../shared/services/api.service';
import { BrlPipe } from '../shared/pipes/brl.pipe';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';
import { Inscricao, Pagamento, Parcela, Participante } from '../shared/models';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-pagamentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzPageHeaderModule,
    NzTableModule,
    NzInputModule,
    NzInputNumberModule,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzRadioModule,
    NzDatePickerModule,
    NzSpinModule,
    NzEmptyModule,
    NzAlertModule,
    NzIconModule,
    NzDividerModule,
    NzToolTipModule,
    BrlPipe,
  ],
  styles: [`
    :host { display: block; }

    /* ── layout grid ─────────────────────────────────── */
    .root {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      align-items: stretch;
      height: calc(100vh - 198px);
      overflow: hidden;
    }

    /* ── search ──────────────────────────────────────── */
    .search-wrap { padding: 0; }

    /* ── participant list ────────────────────────────── */
    .participante-row { cursor: pointer; transition: background 0.15s; }
    .participante-row:hover td { background: #f5f5f5 !important; }
    .participante-row.ativo td  { background: #e6f7ff !important; }
    .part-table-wrap  { display: block; }
    .part-list-mobile { display: none; }

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

    /* ── mobile step-2 sticky header ─────────────────── */
    .mobile-step-header {
      display: none;
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
      padding: 12px 16px;
      align-items: center;
      gap: 12px;
    }
    .msh-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #1890ff, #096dd9);
      color: #fff; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .msh-info { flex: 1; min-width: 0; overflow: hidden; }
    .msh-nome { font-size: 15px; font-weight: 700; color: #1a1a1a;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .msh-sub  { font-size: 12px; color: #888; margin-top: 1px; }

    /* ── participant profile (desktop right panel) ───── */
    .perfil {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      margin-bottom: 14px;
      flex-shrink: 0;
    }
    .avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: #1890ff; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 600; flex-shrink: 0;
    }
    .perfil-info { flex: 1; min-width: 0; }
    .perfil-info h3 { margin: 0; font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .perfil-info p  { margin: 2px 0 0; font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .perfil-stats   { margin-left: auto; flex-shrink: 0; display: flex; gap: 18px; text-align: center; }
    .stat-val  { font-size: 20px; font-weight: 700; color: #1890ff; line-height: 1; }
    .stat-val.verde { color: #52c41a; }
    .stat-lbl  { font-size: 11px; color: #aaa; margin-top: 2px; }

    /* ── mobile: stats bar (inline, compact) ─────────── */
    .mobile-stats {
      display: none;
      gap: 0;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      padding: 0;
    }
    .ms-item {
      flex: 1;
      padding: 10px 0;
      text-align: center;
      border-right: 1px solid #f0f0f0;
    }
    .ms-item:last-child { border-right: none; }
    .ms-val { font-size: 18px; font-weight: 700; color: #1890ff; line-height: 1; }
    .ms-val.verde { color: #52c41a; }
    .ms-val.laranja { color: #fa8c16; }
    .ms-lbl { font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }

    /* ── carne chips ─────────────────────────────────── */
    .carnes-label {
      font-size: 11px; color: #aaa;
      text-transform: uppercase; letter-spacing: .5px;
      margin-bottom: 8px; flex-shrink: 0;
    }
    .carnes-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      flex-shrink: 0;
    }
    .carne-chip {
      border: 1.5px solid #d9d9d9;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.15s;
      min-width: 90px;
      text-align: center;
      background: #fff;
    }
    .carne-chip:hover { border-color: #1890ff; }
    .carne-chip.ativo  { border-color: #1890ff; background: #e6f7ff; }
    .carne-chip.quitado { border-color: #b7eb8f; background: #f6ffed; cursor: pointer; }
    .chip-num  { font-size: 15px; font-weight: 700; color: #1890ff; }
    .chip-num.quitado { color: #52c41a; }
    .chip-prog { font-size: 11px; color: #888; margin-top: 3px; }
    .mini-bar  { height: 3px; border-radius: 2px; background: #f0f0f0; margin-top: 5px; }
    .mini-bar-fill { height: 3px; border-radius: 2px; background: #52c41a; }

    /* ── mobile: carne chips (horizontal scroll) ─────── */
    .carnes-chips-mobile {
      display: none;
      flex-wrap: nowrap;
      overflow-x: auto;
      overflow-y: visible;
      gap: 10px;
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .carnes-chips-mobile::-webkit-scrollbar { display: none; }
    .cc-mobile {
      flex-shrink: 0;
      width: 96px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 10px 8px 8px;
      text-align: center;
      background: #fff;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: all 0.15s;
    }
    .cc-mobile.ativo  { border-color: #1890ff; background: #e6f7ff; }
    .cc-mobile.quitado { border-color: #b7eb8f; background: #f6ffed; }
    .cc-mobile-num { font-size: 16px; font-weight: 800; color: #1890ff; }
    .cc-mobile-num.quitado { color: #52c41a; }
    .cc-mobile-label { font-size: 10px; color: #888; margin-top: 3px; }
    .cc-mobile-bar { height: 4px; border-radius: 3px; background: #f0f0f0; margin-top: 7px; }
    .cc-mobile-bar-fill { height: 4px; border-radius: 3px; background: #52c41a; }

    /* ── parcela items ───────────────────────────────── */
    .parcela-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 6px;
      border: 1px solid #f0f0f0;
      transition: background 0.12s;
    }
    .parcela-item.paga     { background: #fafffe; }
    .parcela-item.pendente { background: #fff; }
    .parcela-item.pendente:hover { background: #fffbe6; border-color: #ffe58f; }
    .num-badge {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
    }
    .num-badge.paga     { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
    .num-badge.pendente { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
    .parcela-dados { flex: 1; min-width: 0; }
    .parcela-titulo { font-weight: 600; font-size: 13px; }
    .parcela-detalhe { font-size: 12px; color: #888; margin-top: 2px; }
    .parcela-valor  { font-size: 14px; font-weight: 600; }
    .parcela-valor.paga { color: #52c41a; }
    .parcela-valor.pendente { color: #fa8c16; }

    /* ── right panel ────────────────────────────────── */
    .painel-right {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    /* ── empty states ────────────────────────────────── */
    .empty-center {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 320px; color: #bbb;
    }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty-txt  { font-size: 15px; }

    /* ── mobile: parcela items (larger touch) ─────────── */
    .parcela-item-mobile {
      display: none;
      align-items: center;
      gap: 14px;
      padding: 16px;
      margin: 0 12px 8px;
      border-radius: 12px;
      border: 1.5px solid #f0f0f0;
      background: #fff;
      -webkit-tap-highlight-color: transparent;
    }
    .parcela-item-mobile.paga    { background: #f6ffed; border-color: #d9f7be; }
    .parcela-item-mobile.pendente { background: #fff; }
    .pim-badge {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; flex-shrink: 0;
    }
    .pim-badge.paga    { background: #d9f7be; color: #389e0d; }
    .pim-badge.pendente { background: #fff7e6; color: #fa8c16; border: 1.5px solid #ffd591; }
    .pim-dados { flex: 1; min-width: 0; }
    .pim-titulo { font-size: 15px; font-weight: 700; color: #1a1a1a; }
    .pim-detalhe { font-size: 12px; color: #888; margin-top: 3px; line-height: 1.4; }
    .pim-detalhe.paga { color: #52c41a; }

    /* ── section labels (mobile only) ───────────────────*/
    .section-label {
      display: none;
      font-size: 11px; color: #aaa; text-transform: uppercase;
      letter-spacing: .5px; padding: 12px 16px 6px;
      flex-shrink: 0;
    }

    /* ── carne header (parcelas) ─────────────────────── */
    .carne-header {
      display: flex; align-items: baseline;
      justify-content: space-between;
      margin-bottom: 10px; flex-shrink: 0;
    }
    .carne-header-title { font-weight: 600; font-size: 15px; }
    .carne-header-sub   { font-size: 13px; color: #888; }

    /* ═══════════════ MOBILE ═══════════════════════════ */
    @media (max-width: 1024px) {
      .root {
        grid-template-columns: 1fr;
        height: auto;
        overflow: visible;
        gap: 0;
      }

      /* step navigation */
      .painel-left.tem-participante { display: none; }
      .painel-right { display: none !important; }
      .painel-right.tem-participante { display: flex !important; flex-direction: column; }

      /* hide desktop elements */
      .part-table-wrap { display: none; }
      .perfil       { display: none; }
      .perfil-stats { display: none; }
      .carnes-chips { display: none; }
      .carnes-label { display: none; }
      .carne-header { display: none; }
      .empty-center { min-height: 180px; }

      /* show mobile elements */
      .mobile-step-header {
        display: flex;
        position: fixed;
        top: 54px;
        left: 0;
        right: 0;
        z-index: 100;
      }
      .mobile-stats        { display: flex; }
      .part-list-mobile    { display: block; }
      .carnes-chips-mobile { display: flex; width: 100%; min-width: 0; overflow-x: auto; }
      .parcela-item        { display: none !important; }
      .parcela-item-mobile { display: flex; }
      .section-label       { display: block; }

    }
  `],
  template: `
    <nz-page-header nzTitle="Pagamentos" nzSubtitle="Busque por nome, CPF ou telefone e selecione um participante para registrar pagamentos das inscrições" />

    <div class="root">

      <!-- ══════════════ PAINEL ESQUERDO ══════════════ -->
      <nz-card nzSize="small" nzTitle="Participantes" style="overflow:auto"
               class="painel-left" [class.tem-participante]="!!participanteId">
        <div class="search-wrap">
          <nz-input-group [nzSuffix]="icBusca">
            <input nz-input [(ngModel)]="busca"
                   placeholder="Nome, CPF ou telefone"
                   [ngModelOptions]="{standalone:true}" (input)="onBuscaInput($event)" />
          </nz-input-group>
          <ng-template #icBusca><span nz-icon nzType="search"></span></ng-template>
        </div>

        <!-- Desktop: table -->
        <div class="part-table-wrap">
          <nz-table
            #tbPart
            [nzData]="participantes"
            [nzLoading]="buscandoParticipante"
            nzSize="small"
            [nzShowPagination]="participantes.length > 10"
            [nzPageSize]="10"
            [nzNoResult]="semPart">
            <thead>
              <tr>
                <th>Nome</th>
                <th nzWidth="90px" style="color:#aaa">RG</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of tbPart.data"
                  class="participante-row"
                  [class.ativo]="p.id === participanteId"
                  (click)="selecionarParticipante(p)">
                <td>{{ p.nome }}</td>
                <td style="font-size:11px; color:#aaa">{{ p.rg || '—' }}</td>
              </tr>
            </tbody>
          </nz-table>
          <ng-template #semPart>
            <p style="text-align:center;color:#ccc;padding:16px 0;font-size:13px">Nenhum resultado</p>
          </ng-template>
        </div>

        <!-- Mobile: touch cards (igual à tela de Vendas) -->
        <div class="part-list-mobile">
          <nz-spin *ngIf="buscandoParticipante" style="display:block;text-align:center;padding:32px" />
          <ng-container *ngIf="!buscandoParticipante">
            <p *ngIf="participantes.length === 0"
               style="text-align:center;color:#ccc;padding:24px 0;font-size:13px">Nenhum resultado</p>
            <div *ngFor="let p of participantes"
                 class="part-item"
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
      </nz-card>

      <!-- ══════════════ PAINEL DIREITO ══════════════ -->
      <div class="painel-right" [class.tem-participante]="!!participanteId">

        <!-- Mobile: sticky header with back button -->
        <div class="mobile-step-header" *ngIf="participanteId">
          <button nz-button nzType="text" (click)="deselecionar()"
                  style="padding:0 6px; flex-shrink:0">
            <span nz-icon nzType="arrow-left"></span>
          </button>
          <div class="msh-avatar">{{ iniciais }}</div>
          <div class="msh-info">
            <div class="msh-nome">{{ participanteSelecionado?.nome }}</div>
            <div class="msh-sub">{{ participanteSelecionado?.cpf || participanteSelecionado?.telefone || 'Sem contato' }}</div>
          </div>
        </div>

        <!-- Mobile: compact stats bar -->
        <div class="mobile-stats" *ngIf="participanteId && !carregandoInscricoes">
          <div class="ms-item">
            <div class="ms-val">{{ inscricoes.length }}</div>
            <div class="ms-lbl">Inscrições</div>
          </div>
          <div class="ms-item">
            <div class="ms-val verde">{{ inscricoesQuitadas }}</div>
            <div class="ms-lbl">Quitadas</div>
          </div>
          <div class="ms-item">
            <div class="ms-val laranja">{{ inscricoes.length - inscricoesQuitadas }}</div>
            <div class="ms-lbl">Pendentes</div>
          </div>
        </div>

        <!-- Nenhum participante selecionado -->
        <div *ngIf="!participanteId" class="empty-center">
          <span class="empty-icon" nz-icon nzType="user" nzTheme="outline"></span>
          <p class="empty-txt">Selecione um participante à esquerda</p>
        </div>

        <!-- Carregando inscrições -->
        <nz-spin *ngIf="participanteId && carregandoInscricoes"
          nzTip="Carregando inscrições..." style="display:block;text-align:center;padding:60px" />

        <!-- Conteúdo carregado -->
        <ng-container *ngIf="participanteId && !carregandoInscricoes">

          <!-- Desktop: perfil header -->
          <div class="perfil">
            <div class="avatar">{{ iniciais }}</div>
            <div class="perfil-info">
              <h3>{{ participanteSelecionado?.nome }}</h3>
              <p>{{ participanteSelecionado?.telefone || participanteSelecionado?.cpf || 'Sem contato' }}</p>
            </div>
            <div class="perfil-stats">
              <div>
                <div class="stat-val">{{ inscricoes.length }}</div>
                <div class="stat-lbl">inscrição(ões)</div>
              </div>
              <div>
                <div class="stat-val verde">{{ inscricoesQuitadas }}</div>
                <div class="stat-lbl">quitada(s)</div>
              </div>
              <div>
                <div class="stat-val" style="color:#fa8c16">{{ inscricoes.length - inscricoesQuitadas }}</div>
                <div class="stat-lbl">pendente(s)</div>
              </div>
            </div>
          </div>

          <!-- Sem inscrições -->
          <nz-empty *ngIf="inscricoes.length === 0"
            nzNotFoundContent="Este participante não tem inscrições nesta excursão" />

          <!-- Com inscrições -->
          <div *ngIf="inscricoes.length > 0" style="display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden">

            <!-- Desktop: chips -->
            <p class="carnes-label">Inscrições — clique para ver parcelas</p>
            <div class="carnes-chips">
              <div *ngFor="let c of inscricoes"
                   class="carne-chip"
                   [class.ativo]="c.id === inscricaoId && !c.quitado"
                   [class.quitado]="c.quitado"
                   [nz-tooltip]="c.quitado ? 'Todas as parcelas pagas' : pagas(c) + ' de ' + c.parcelas.length + ' pagas'"
                   role="button" tabindex="0"
                   (click)="selecionarInscricao(c)"
                   (keydown.enter)="selecionarInscricao(c)"
                   (keydown.space)="$event.preventDefault(); selecionarInscricao(c)">
                <div class="chip-num" [class.quitado]="c.quitado">{{ rotuloAssento(c) }}</div>
                <div class="chip-prog">
                  <nz-tag nzSize="small" [nzColor]="c.quitado ? 'success' : pagas(c) > 0 ? 'processing' : 'default'" style="margin:0;font-size:10px">
                    {{ c.quitado ? 'Quitado' : pagas(c) + '/' + c.parcelas.length }}
                  </nz-tag>
                </div>
                <div class="mini-bar">
                  <div class="mini-bar-fill" [style.width.%]="(pagas(c) / c.parcelas.length) * 100"></div>
                </div>
              </div>
            </div>

            <!-- Mobile: horizontal scroll chips -->
            <div class="section-label">Inscrições — toque para ver parcelas</div>
            <div class="carnes-chips-mobile">
              <div *ngFor="let c of inscricoes"
                   class="cc-mobile"
                   [class.ativo]="c.id === inscricaoId && !c.quitado"
                   [class.quitado]="c.quitado"
                   role="button" tabindex="0"
                   (click)="selecionarInscricao(c)"
                   (keydown.enter)="selecionarInscricao(c)"
                   (keydown.space)="$event.preventDefault(); selecionarInscricao(c)">
                <div class="cc-mobile-num" [class.quitado]="c.quitado">
                  <span *ngIf="!c.quitado">{{ rotuloAssento(c) }}</span>
                  <span *ngIf="c.quitado">✓ {{ rotuloAssento(c) }}</span>
                </div>
                <div class="cc-mobile-label">
                  <span *ngIf="c.quitado" style="color:#52c41a">Quitado</span>
                  <span *ngIf="!c.quitado">{{ pagas(c) }}/{{ c.parcelas.length }}</span>
                </div>
                <div class="cc-mobile-bar">
                  <div class="cc-mobile-bar-fill" [style.width.%]="(pagas(c) / c.parcelas.length) * 100"></div>
                </div>
              </div>
            </div>

            <nz-divider *ngIf="inscricaoSelecionada" style="flex-shrink:0;margin:12px 0" />

            <!-- Parcelas da inscrição selecionada -->
            <ng-container *ngIf="inscricaoSelecionada">

              <!-- Desktop: header -->
              <div class="carne-header">
                <span class="carne-header-title">
                  {{ rotuloAssento(inscricaoSelecionada) }} — Parcelas
                </span>
                <span class="carne-header-sub">
                  Valor por parcela: <strong>{{ valorParcela | brl }}</strong>
                </span>
              </div>

              <!-- Mobile: section label -->
              <div class="section-label">
                {{ rotuloAssento(inscricaoSelecionada) }}
                &nbsp;·&nbsp; {{ valorParcela | brl }} / parcela
              </div>

              <div style="flex:1; min-height:0; overflow-y:auto; padding-right:4px">

                <!-- Desktop parcela items -->
                <div *ngFor="let p of inscricaoSelecionada.parcelas"
                     class="parcela-item"
                     [class.paga]="p.status === 'paga'"
                     [class.pendente]="p.status === 'pendente'">
                  <div class="num-badge" [class.paga]="p.status === 'paga'" [class.pendente]="p.status === 'pendente'">
                    {{ pad(p.numero) }}
                  </div>
                  <div class="parcela-dados">
                    <div class="parcela-titulo">Parcela {{ pad(p.numero) }}</div>
                    <div class="parcela-detalhe" *ngIf="p.status === 'paga' && p.pagamentos?.[0]">
                      <span nz-icon nzType="check-circle" nzTheme="outline" style="color:#52c41a;margin-right:4px"></span>
                      {{ p.pagamentos?.[0]?.dataPagamento | date:'dd/MM/yyyy':'UTC' }}
                      &nbsp;·&nbsp;
                      {{ p.pagamentos?.[0]?.metodo === 'pix' ? 'Pix' : 'Dinheiro' }}
                      <span *ngIf="p.pagamentos?.[0]?.referencia" style="color:#aaa">
                        &nbsp;· {{ p.pagamentos?.[0]?.referencia }}
                      </span>
                      <button *ngIf="p.pagamentos?.[0]?.comprovante"
                              nz-button nzType="link" nzSize="small"
                              style="padding:0 4px;height:auto"
                              (click)="verComprovante(p.pagamentos?.[0])">
                        <span nz-icon nzType="paper-clip"></span> comprovante
                      </button>
                      <button nz-button nzType="link" nzSize="small"
                              style="padding:0 4px;height:auto"
                              nz-tooltip nzTooltipTitle="Editar pagamento"
                              (click)="abrirEdicaoPagamento(p.pagamentos![0], p)">
                        <span nz-icon nzType="edit"></span>
                      </button>
                      <button nz-button nzType="link" nzSize="small" nzDanger
                              style="padding:0 4px;height:auto"
                              nz-tooltip nzTooltipTitle="Cancelar pagamento"
                              (click)="cancelarPagamento(p.pagamentos![0])">
                        <span nz-icon nzType="delete"></span>
                      </button>
                    </div>
                    <div class="parcela-detalhe" *ngIf="p.status === 'pendente'">
                      <ng-container *ngIf="pagoNaParcela(p) > 0; else aguardando">
                        Parcial: {{ pagoNaParcela(p) | brl }} de {{ valorParcela | brl }}
                        &nbsp;·&nbsp; falta {{ restanteDaParcela(p) | brl }}
                      </ng-container>
                      <ng-template #aguardando>Aguardando pagamento</ng-template>
                    </div>
                  </div>
                  <div class="parcela-valor" [class.paga]="p.status === 'paga'" [class.pendente]="p.status === 'pendente'">
                    <span *ngIf="p.status === 'paga'">{{ pagoNaParcela(p) | brl }}</span>
                    <button *ngIf="p.status === 'pendente'"
                            nz-button nzType="primary" nzSize="small"
                            (click)="abrirPagamento(p)">
                      <span nz-icon nzType="dollar"></span> Registrar
                    </button>
                  </div>
                </div>

                <!-- Mobile parcela items (larger touch targets) -->
                <div *ngFor="let p of inscricaoSelecionada.parcelas"
                     class="parcela-item-mobile"
                     [class.paga]="p.status === 'paga'"
                     [class.pendente]="p.status === 'pendente'">
                  <div class="pim-badge" [class.paga]="p.status === 'paga'" [class.pendente]="p.status === 'pendente'">
                    <span *ngIf="p.status === 'paga'" nz-icon nzType="check" style="font-size:16px"></span>
                    <span *ngIf="p.status === 'pendente'">{{ pad(p.numero) }}</span>
                  </div>
                  <div class="pim-dados">
                    <div class="pim-titulo">Parcela {{ pad(p.numero) }}</div>
                    <div class="pim-detalhe" [class.paga]="p.status === 'paga'" *ngIf="p.status === 'paga' && p.pagamentos?.[0]">
                      {{ p.pagamentos?.[0]?.dataPagamento | date:'dd/MM/yyyy':'UTC' }}
                      &nbsp;·&nbsp;
                      {{ p.pagamentos?.[0]?.metodo === 'pix' ? 'Pix' : 'Dinheiro' }}
                      &nbsp;·&nbsp;
                      {{ p.pagamentos?.[0]?.valorPago | brl }}
                    </div>
                    <div class="pim-detalhe" *ngIf="p.status === 'pendente'">
                      <ng-container *ngIf="pagoNaParcela(p) > 0; else aguardandoM">
                        Parcial: {{ pagoNaParcela(p) | brl }} / {{ valorParcela | brl }}
                      </ng-container>
                      <ng-template #aguardandoM>Aguardando &nbsp;·&nbsp; {{ valorParcela | brl }}</ng-template>
                    </div>
                  </div>
                  <button *ngIf="p.status === 'pendente'"
                          nz-button nzType="primary" nzSize="default"
                          (click)="abrirPagamento(p)"
                          style="flex-shrink:0">
                    <span nz-icon nzType="dollar"></span>
                  </button>
                  <button *ngIf="p.status === 'paga' && p.pagamentos?.[0]?.comprovante"
                          nz-button nzSize="default"
                          (click)="verComprovante(p.pagamentos?.[0])"
                          style="flex-shrink:0"
                          aria-label="Ver comprovante">
                    <span nz-icon nzType="paper-clip"></span>
                  </button>
                  <span *ngIf="p.status === 'paga'"
                        nz-icon nzType="check-circle" nzTheme="outline"
                        style="color:#52c41a; font-size:20px; flex-shrink:0"></span>
                </div>

              </div>
            </ng-container>

            <!-- Nenhuma inscrição selecionada ainda -->
            <div *ngIf="!inscricaoSelecionada" class="empty-center" style="min-height:160px">
              <span style="font-size:32px;color:#ddd" nz-icon nzType="profile" nzTheme="outline"></span>
              <p style="color:#ccc;margin-top:8px;font-size:13px">Selecione uma inscrição acima</p>
            </div>
          </div>

        </ng-container>
      </div>
    </div>

    <!-- ══════════ MODAL DE PAGAMENTO ══════════ -->
    <nz-modal
      [(nzVisible)]="modalVisivel"
      [nzTitle]="modalTitulo"
      [nzOkLoading]="registrando"
      (nzOnOk)="confirmarPagamento()"
      (nzOnCancel)="fecharModal()"
      nzOkText="Confirmar Pagamento"
      nzCancelText="Cancelar"
      nzWidth="440px">

      <ng-container *nzModalContent>
        <nz-alert
          *ngIf="avisoRetroativo"
          nzType="warning"
          nzMessage="Data retroativa superior a 30 dias"
          style="margin-bottom:16px"
          nzShowIcon />

        <nz-alert *ngIf="previewDistribuicao && (previewDistribuicao.cobre > 1 || previewDistribuicao.parcial)"
          nzType="info" nzShowIcon style="margin-bottom:16px"
          [nzMessage]="(previewDistribuicao.cobre ? previewDistribuicao.cobre + ' parcela(s) serão quitadas' : '')
            + (previewDistribuicao.parcial ? (previewDistribuicao.cobre ? '; ' : '') + 'parcial de ' + (previewDistribuicao.parcial.valor | brl) + ' na parcela ' + pad(previewDistribuicao.parcial.numero) : '')" />

        <nz-alert *ngIf="previewDistribuicao && previewDistribuicao.sobra > 0"
          nzType="error" nzShowIcon style="margin-bottom:16px"
          [nzMessage]="'Valor excede o total devido em ' + (previewDistribuicao.sobra | brl)" />

        <form nz-form [formGroup]="form" nzLayout="vertical">

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <nz-form-item style="margin-bottom:0">
              <nz-form-label nzRequired>Valor pago</nz-form-label>
              <nz-form-control [nzValidateStatus]="form.get('valorPago')!" nzErrorTip="Informe o valor">
                <nz-input-group nzPrefix="R$">
                  <input nz-input type="text" inputmode="numeric" placeholder="0,00"
                         [value]="valorPagoDisplay"
                         (input)="mascaraValorBRL($event)" />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item style="margin-bottom:0">
              <nz-form-label nzRequired>Data do recebimento</nz-form-label>
              <nz-form-control nzErrorTip="Informe a data">
                <nz-date-picker
                  style="width:100%"
                  nzFormat="dd/MM/yyyy"
                  formControlName="dataPagamento" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <nz-divider style="margin:16px 0 12px" />

          <nz-form-item style="margin-bottom:0">
            <nz-form-label nzRequired>Método de pagamento</nz-form-label>
            <nz-form-control>
              <nz-radio-group formControlName="metodo" nzButtonStyle="solid">
                <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
                <label nz-radio-button nzValue="dinheiro">
                  <span nz-icon nzType="wallet"></span> Dinheiro
                </label>
                <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
                <label nz-radio-button nzValue="pix">
                  <span nz-icon nzType="qrcode"></span> Pix
                </label>
              </nz-radio-group>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item *ngIf="form.value.metodo === 'pix'" style="margin-top:12px;margin-bottom:0">
            <nz-form-label>Referência (opcional)</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="referencia" placeholder="Código ou ID da transação" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item *ngIf="form.value.metodo === 'pix'" style="margin-top:12px;margin-bottom:0">
            <nz-form-label nzRequired>Comprovante (imagem ou PDF)</nz-form-label>
            <nz-form-control>
              <input #fileInput type="file" accept="image/*,application/pdf" hidden
                     (change)="onComprovanteSelected($event)" />
              <button nz-button type="button" (click)="fileInput.click()">
                <span nz-icon nzType="paper-clip"></span>
                {{ comprovanteFile ? 'Trocar arquivo' : 'Selecionar arquivo' }}
              </button>
              <span *ngIf="comprovanteFile" style="margin-left:10px;font-size:13px;color:#555">
                {{ comprovanteFile.name }}
                <button nz-button nzType="link" nzSize="small" type="button"
                        style="padding:0;height:auto;margin-left:6px;color:#aaa"
                        aria-label="Remover arquivo" (click)="removerComprovante()">
                  <span nz-icon nzType="close"></span>
                </button>
              </span>
              <div *ngIf="comprovanteErro" style="color:#ff4d4f;font-size:12px;margin-top:6px">
                {{ comprovanteErro }}
              </div>
              <div style="color:#aaa;font-size:11px;margin-top:6px">
                Imagem (JPG, PNG, WEBP, GIF) ou PDF, até 5MB.
              </div>
            </nz-form-control>
          </nz-form-item>

        </form>
      </ng-container>
    </nz-modal>

    <!-- Modal: visualizar comprovante (imagem ou PDF) -->
    <nz-modal
      [(nzVisible)]="comprovanteModalVisivel"
      nzTitle="Comprovante de pagamento"
      [nzFooter]="null"
      (nzOnCancel)="fecharComprovante()"
      nzWidth="720px">
      <ng-container *nzModalContent>
        <div *ngIf="!comprovanteUrlSafe" style="text-align:center;padding:32px;color:#888">
          Carregando comprovante...
        </div>
        <div *ngIf="comprovanteUrlSafe && comprovanteTipo === 'image'"
             style="display:flex;justify-content:center;align-items:center;background:#fafafa;border-radius:6px;padding:8px">
          <img [src]="comprovanteUrlRaw" alt="Comprovante"
               style="max-width:100%;max-height:70vh;object-fit:contain" />
        </div>
        <iframe *ngIf="comprovanteUrlSafe && comprovanteTipo === 'pdf'"
                [src]="comprovanteUrlSafe"
                style="width:100%;height:70vh;border:1px solid #f0f0f0;border-radius:6px"
                title="Comprovante"></iframe>
        <div *ngIf="comprovanteUrlRaw" style="margin-top:12px;text-align:right">
          <a [href]="comprovanteUrlRaw" target="_blank" rel="noopener" nz-button nzType="link">
            <span nz-icon nzType="paper-clip"></span> Abrir em nova aba
          </a>
        </div>
      </ng-container>
    </nz-modal>
  `,
})
export class PagamentosComponent implements OnInit, OnDestroy {
  excursaoAtiva = inject(ExcursaoAtivaService);
  private sanitizer = inject(DomSanitizer);
  private modal = inject(NzModalService);

  // Visualização de comprovante (modal inline)
  comprovanteModalVisivel = false;
  comprovanteUrlSafe: SafeResourceUrl | null = null;
  comprovanteUrlRaw: string | null = null;
  comprovanteTipo: 'pdf' | 'image' | null = null;

  // Edição de pagamento existente (vs. registrar novo)
  pagamentoEditando: Pagamento | null = null;

  participantes: Participante[] = [];
  participanteId: string | null = null;
  participanteSelecionado: Participante | null = null;
  buscandoParticipante = false;
  busca = '';

  inscricoes: InscricaoComParcelas[] = [];
  carregandoInscricoes = false;
  inscricaoId: string | null = null;

  parcelaSelecionada: Parcela | null = null;
  modalVisivel = false;
  registrando = false;
  avisoRetroativo = false;
  comprovanteFile: File | null = null;
  comprovanteErro = '';

  form!: ReturnType<typeof this.criarForm>;
  private buscaSubject = new Subject<string>();

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private message: NzMessageService,
  ) {
    this.form = this.criarForm();
  }

  private criarForm() {
    return this.fb.group({
      valorPago:     [0, [Validators.required, Validators.min(0.01)]],
      dataPagamento: [new Date(), Validators.required],
      metodo:        ['dinheiro', Validators.required],
      referencia:    [''],
    });
  }

  ngOnInit() {
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

    this.form.get('dataPagamento')!.valueChanges.subscribe(v => this.verificarRetroativo(v));
    this.form.get('metodo')!.valueChanges.subscribe(() => this.onMetodoChange());
  }

  carregarParticipantes() {
    this.buscandoParticipante = true;
    this.api.get<Participante[]>('participantes').subscribe({
      next: (data) => { this.participantes = data; this.buscandoParticipante = false; },
      error: () => { this.buscandoParticipante = false; },
    });
  }

  onBusca() { this.buscaSubject.next(this.busca); }

  onBuscaInput(event: Event) {
    this.busca = (event.target as HTMLInputElement).value;
    this.buscaSubject.next(this.busca);
  }

  selecionarParticipante(p: Participante) {
    if (p.id === this.participanteId) return;
    this.participanteId = p.id;
    this.participanteSelecionado = p;
    this.inscricaoId = null;
    this.inscricoes = [];
    this.carregarInscricoes();
  }

  deselecionar() {
    this.participanteId = null;
    this.participanteSelecionado = null;
    this.inscricaoId = null;
    this.inscricoes = [];
  }

  carregarInscricoes() {
    const excursaoId = this.excursaoAtiva.excursao()?.id;
    this.carregandoInscricoes = true;
    this.api.get<InscricaoComParcelas[]>('inscricoes/participante', { excursaoId: excursaoId!, participanteId: this.participanteId! }).subscribe({
      next: (data) => {
        this.inscricoes = data;
        this.carregandoInscricoes = false;
        const pendente = data.find(c => !c.quitado);
        this.inscricaoId = (pendente ?? data[0])?.id ?? null;
      },
      error: () => { this.carregandoInscricoes = false; },
    });
  }

  selecionarInscricao(inscricao: InscricaoComParcelas) { this.inscricaoId = inscricao.id; }

  get inscricaoSelecionada(): InscricaoComParcelas | null {
    return this.inscricoes.find(c => c.id === this.inscricaoId) ?? null;
  }

  rotuloAssento(i: InscricaoComParcelas): string {
    return i.numeroAssento != null ? `Assento ${i.numeroAssento}` : 'Sem assento';
  }

  get iniciais(): string {
    return this.iniciaisParticipante(this.participanteSelecionado);
  }

  iniciaisParticipante(p: Participante | null): string {
    const nome: string = p?.nome ?? '';
    return nome.split(' ').slice(0, 2).map((s: string) => s[0]).join('').toUpperCase();
  }

  get valorParcela(): number {
    const e = this.excursaoAtiva.excursao();
    if (!e) return 0;
    return Number(e.valor) / e.numParcelas;
  }

  /** Soma de tudo já pago numa parcela (útil para parcelas parciais ou múltiplos pagamentos). */
  pagoNaParcela(p: Parcela): number {
    return (p.pagamentos ?? []).reduce(
      (acc, pg) => acc + Number(pg.valorPago),
      0,
    );
  }

  /** Quanto ainda falta pra quitar a parcela (valorParcela − jáPago). */
  restanteDaParcela(p: Parcela): number {
    return Math.max(0, this.valorParcela - this.pagoNaParcela(p));
  }

  /** Preview de como o valor digitado será distribuído entre as parcelas pendentes. */
  get previewDistribuicao(): { cobre: number; parcial: { numero: number; valor: number } | null; sobra: number } | null {
    if (this.pagamentoEditando) return null; // edição não distribui
    const insc = this.inscricaoSelecionada;
    if (!this.parcelaSelecionada || !insc) return null;
    const valor = Number(this.form.value.valorPago) || 0;
    if (valor <= 0) return null;
    const pendentes = insc.parcelas
      .filter((x) => x.status !== 'paga' && x.numero >= this.parcelaSelecionada!.numero)
      .sort((a, b) => a.numero - b.numero);
    let restante = valor;
    let cobre = 0;
    let parcial: { numero: number; valor: number } | null = null;
    for (const p of pendentes) {
      if (restante < 0.005) break;
      const faltando = this.restanteDaParcela(p);
      if (faltando < 0.005) continue;
      if (restante >= faltando - 0.005) {
        cobre++;
        restante = Math.max(0, restante - faltando);
      } else {
        parcial = { numero: p.numero, valor: Math.round(restante * 100) / 100 };
        restante = 0;
      }
    }
    return { cobre, parcial, sobra: Math.round(restante * 100) / 100 };
  }

  get inscricoesQuitadas(): number {
    return this.inscricoes.filter(c => c.quitado).length;
  }

  pad(n: number): string { return String(n).padStart(2, '0'); }

  valorPagoDisplay = '';

  mascaraValorBRL(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    const fmt = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    input.value = fmt;
    this.valorPagoDisplay = fmt;
    this.form.patchValue({ valorPago: num > 0 ? num : null });
  }

  get modalTitulo(): string {
    if (this.pagamentoEditando) {
      return `Editar pagamento — Parcela ${this.pad(this.parcelaSelecionada?.numero ?? 0)}`;
    }
    if (!this.parcelaSelecionada || !this.inscricaoSelecionada) return 'Registrar Pagamento';
    return `Parcela ${this.pad(this.parcelaSelecionada.numero)} — ${this.rotuloAssento(this.inscricaoSelecionada)}`;
  }

  pagas(inscricao: InscricaoComParcelas): number {
    return inscricao.parcelas.filter((p: Parcela) => p.status === 'paga').length;
  }

  abrirPagamento(parcela: Parcela) {
    this.parcelaSelecionada = parcela;
    this.pagamentoEditando = null;
    this.avisoRetroativo = false;
    this.comprovanteFile = null;
    this.comprovanteErro = '';
    const inicial = this.restanteDaParcela(parcela);
    this.valorPagoDisplay = inicial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.form.patchValue({
      valorPago:     inicial,
      dataPagamento: new Date(),
      metodo:        'dinheiro',
      referencia:    '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalVisivel = true;
  }

  fecharModal() {
    this.modalVisivel = false;
    this.parcelaSelecionada = null;
    this.pagamentoEditando = null;
  }

  verificarRetroativo(data: Date | null) {
    if (!data) { this.avisoRetroativo = false; return; }
    this.avisoRetroativo = Math.floor((Date.now() - data.getTime()) / 86_400_000) > 30;
  }

  onMetodoChange() {
    // Referência é sempre opcional; ao sair do Pix, limpa anexo e referência.
    if (this.form.value.metodo !== 'pix') {
      this.form.get('referencia')!.setValue('');
      this.comprovanteFile = null;
      this.comprovanteErro = '';
    }
  }

  onComprovanteSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.comprovanteErro = '';
    if (file) {
      const tipoOk = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!tipoOk) {
        this.comprovanteErro = 'O arquivo deve ser uma imagem ou PDF.';
        this.comprovanteFile = null;
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.comprovanteErro = 'O arquivo excede o limite de 5MB.';
        this.comprovanteFile = null;
        input.value = '';
        return;
      }
    }
    this.comprovanteFile = file;
  }

  removerComprovante() {
    this.comprovanteFile = null;
    this.comprovanteErro = '';
  }

  verComprovante(pagamento?: Pagamento) {
    if (!pagamento?.id) return;
    this.api.getBlob(`pagamentos/${pagamento.id}/comprovante`).subscribe({
      next: (blob) => {
        // Limpa URL anterior (se reabrir outro comprovante)
        if (this.comprovanteUrlRaw) URL.revokeObjectURL(this.comprovanteUrlRaw);
        const url = URL.createObjectURL(blob);
        this.comprovanteUrlRaw = url;
        this.comprovanteUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.comprovanteTipo = blob.type === 'application/pdf' ? 'pdf' : 'image';
        this.comprovanteModalVisivel = true;
      },
      error: () => this.message.error('Não foi possível abrir o comprovante.'),
    });
  }

  fecharComprovante() {
    this.comprovanteModalVisivel = false;
    if (this.comprovanteUrlRaw) {
      URL.revokeObjectURL(this.comprovanteUrlRaw);
      this.comprovanteUrlRaw = null;
    }
    this.comprovanteUrlSafe = null;
    this.comprovanteTipo = null;
  }

  ngOnDestroy() {
    if (this.comprovanteUrlRaw) URL.revokeObjectURL(this.comprovanteUrlRaw);
  }

  abrirEdicaoPagamento(pag: Pagamento, parcela: Parcela) {
    this.pagamentoEditando = pag;
    this.parcelaSelecionada = parcela;
    this.avisoRetroativo = false;
    this.comprovanteFile = null;
    this.comprovanteErro = '';
    const valor = Number(pag.valorPago);
    this.valorPagoDisplay = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.form.patchValue({
      valorPago: valor,
      dataPagamento: new Date(pag.dataPagamento.slice(0, 10) + 'T00:00:00'),
      metodo: pag.metodo,
      referencia: pag.referencia ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalVisivel = true;
  }

  cancelarPagamento(pag: Pagamento) {
    this.modal.confirm({
      nzTitle: 'Cancelar este pagamento?',
      nzContent: 'O pagamento será removido e a parcela voltará ao estado anterior (pendente ou parcial). Esta ação não pode ser desfeita.',
      nzOkText: 'Cancelar pagamento',
      nzOkDanger: true,
      nzCancelText: 'Voltar',
      nzOnOk: () => this.executarCancelarPagamento(pag.id),
    });
  }

  private executarCancelarPagamento(id: string) {
    this.api.delete<unknown>(`pagamentos/${id}`).subscribe({
      next: () => {
        this.message.success('Pagamento cancelado.');
        this.carregarInscricoes();
      },
      error: (err) => this.message.error(err?.error?.message ?? 'Erro ao cancelar pagamento'),
    });
  }

  confirmarPagamento() {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
      return;
    }
    const v = this.form.value;
    const semPix = v.metodo === 'pix'
      && !this.comprovanteFile
      && !this.pagamentoEditando?.comprovante;
    if (semPix) {
      this.comprovanteErro = 'Anexe o comprovante do Pix (imagem ou PDF).';
      return;
    }
    const data = v.dataPagamento as Date;
    const fd = new FormData();
    fd.append('valorPago', String(Number(v.valorPago)));
    fd.append('dataPagamento', localDateStr(data));
    fd.append('metodo', v.metodo as string);
    if (v.referencia) fd.append('referencia', v.referencia);
    if (this.comprovanteFile) fd.append('comprovante', this.comprovanteFile);

    this.registrando = true;
    if (this.pagamentoEditando) {
      // Edição: PATCH (sem parcelaId; mantém a mesma parcela)
      this.api.patch<Pagamento>(`pagamentos/${this.pagamentoEditando.id}`, fd).subscribe({
        next: () => {
          this.message.success('Pagamento atualizado.');
          this.fecharModal();
          this.carregarInscricoes();
          this.registrando = false;
        },
        error: (err) => {
          this.message.error(err?.error?.message ?? 'Erro ao atualizar pagamento');
          this.registrando = false;
        },
      });
      return;
    }
    fd.append('parcelaId', this.parcelaSelecionada!.id);
    this.api.upload<PagamentoResposta>('pagamentos', fd).subscribe({
      next: (res) => {
        const partes: string[] = [];
        if (res.parcelasCobertas && res.parcelasCobertas > 0) {
          partes.push(`${res.parcelasCobertas} parcela(s) quitada(s)`);
        }
        if (res.parcial) {
          partes.push('valor parcial registrado na próxima');
        }
        const detalhe = partes.length ? ` — ${partes.join(', ')}` : '';
        const aviso = res.avisoRetroativo ? ' (atenção: data > 30 dias)' : '';
        this.message.success(`Pagamento registrado${detalhe}${aviso}`);
        this.fecharModal();
        this.carregarInscricoes();
        this.registrando = false;
      },
      error: (err) => {
        this.message.error(err?.error?.message ?? 'Erro ao registrar pagamento');
        this.registrando = false;
      },
    });
  }
}

interface InscricaoComParcelas extends Inscricao {
  parcelas: Parcela[];
  quitado?: boolean;
}

interface PagamentoResposta {
  id?: string;
  parcelasCobertas?: number;
  parcial?: boolean;
  avisoRetroativo?: boolean;
}
