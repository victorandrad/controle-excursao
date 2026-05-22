import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ApiService } from '../shared/services/api.service';
import { BrlPipe } from '../shared/pipes/brl.pipe';
import { AuthService } from '../auth/auth.service';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';
import { Excursao, TipoVeiculo } from '../shared/models';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-excursoes-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzTagModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzDatePickerModule,
    NzSelectModule,
    NzAlertModule,
    NzIconModule,
    NzSpinModule,
    NzEmptyModule,
    NzDividerModule,
    NzPopconfirmModule,
    NzToolTipModule,
    BrlPipe,
  ],
  styles: [`
    /* ── page / topbar ───────────────────────────────── */
    .page { min-height: 100vh; background: #f5f6fa; }
    .topbar {
      background: #fff;
      border-bottom: 1px solid #f0f0f0;
      box-shadow: 0 1px 4px rgba(0,21,41,.06);
      padding: 0 24px;
      min-height: 56px;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .topbar-left  { display: flex; align-items: center; gap: 12px; }
    .topbar-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
    .topbar-sub   { font-size: 13px; color: #888; }
    .page-body    { padding: 24px; }

    /* ── stats ───────────────────────────────────────── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #fff; border-radius: 8px;
      padding: 16px 20px; border: 1px solid #f0f0f0;
      display: flex; align-items: center; gap: 14px;
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    .stat-val { font-size: 22px; font-weight: 700; line-height: 1; }
    .stat-lbl { font-size: 13px; color: #888; margin-top: 4px; }

    /* ── tabela (desktop) ────────────────────────────── */
    .nome-cell    { font-weight: 600; }
    .destino-cell { font-size: 12px; color: #888; margin-top: 2px; }
    .actions      { display: flex; align-items: center; gap: 4px; }
    .table-wrap   { background: #fff; border-radius: 8px; border: 1px solid #f0f0f0; overflow: hidden; }
    .cards-wrap   { display: none; }

    /* ── cards (mobile) ─────────────────────── */
    .cc {
      background: #fff; border-radius: 12px;
      border: 1px solid #f0f0f0;
      margin-bottom: 12px; overflow: hidden;
    }
    .cc-head {
      padding: 14px 16px 10px;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
    }
    .cc-nome  { font-size: 15px; font-weight: 700; color: #1a1a1a; line-height: 1.3; }
    .cc-destino {
      font-size: 12px; color: #888; margin-top: 4px;
      display: flex; align-items: center; gap: 4px;
    }
    .cc-meta {
      display: grid; grid-template-columns: 1fr 1fr;
      border-top: 1px solid #f5f5f5;
    }
    .cc-meta-item {
      padding: 9px 16px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .cc-meta-item:nth-child(odd) { border-right: 1px solid #f5f5f5; }
    .cc-meta-item:nth-child(n+3) { border-top: 1px solid #f5f5f5; }
    .cc-meta-lbl { font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: .4px; }
    .cc-meta-val { font-size: 14px; font-weight: 600; color: #262626; }
    .cc-meta-val.blue { color: #1890ff; }
    .cc-meta-val.sold { color: #52c41a; }
    .cc-foot {
      border-top: 1px solid #f5f5f5;
      display: flex; gap: 0;
    }
    .cc-foot button {
      flex: 1; border-radius: 0 !important;
      border: none !important; border-right: 1px solid #f5f5f5 !important;
      height: 44px !important; font-size: 13px !important;
    }
    .cc-foot button:last-child { border-right: none !important; }
    .cc-encerrada { opacity: .7; }

    /* ── readonly info ───────────────────────────────── */
    .readonly-info {
      background: #fffbe6; border: 1px solid #ffe58f;
      border-radius: 6px; padding: 10px 14px;
      font-size: 12px; color: #7c5800; margin-bottom: 12px;
    }

    /* ── Logout confirmation ─────────────────────────── */
    .logout-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1000;
      animation: lo-fade 0.15s ease;
    }
    .logout-card {
      position: fixed; z-index: 1001;
      background: #fff;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      border-radius: 14px;
      padding: 28px 24px 24px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      text-align: center;
    }
    .lo-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: #fff1f0; margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; color: #ff4d4f;
    }
    .lo-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .lo-desc  { font-size: 13px; color: #888; line-height: 1.55; margin-bottom: 24px; }
    .lo-btns  { display: flex; gap: 10px; }
    .lo-btns button {
      flex: 1; height: 40px; border-radius: 8px;
      font-size: 14px; font-weight: 500;
      cursor: pointer; border: none; transition: opacity 0.15s;
    }
    .lo-btns button:active { opacity: 0.8; }
    .lo-cancel  { background: #f5f5f5; color: #555; }
    .lo-confirm { background: #ff4d4f; color: #fff; }

    @keyframes lo-fade  { from { opacity: 0; }             to { opacity: 1; } }
    @keyframes lo-slide { from { transform: translateY(100%); } to { transform: translateY(0); } }

    @media (max-width: 1024px) {
      .logout-card {
        top: unset; left: 0; right: 0; bottom: 0;
        transform: none; width: 100%;
        border-radius: 20px 20px 0 0;
        padding: 28px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        animation: lo-slide 0.25s ease;
      }
      .lo-icon  { width: 64px; height: 64px; font-size: 28px; margin-bottom: 18px; }
      .lo-title { font-size: 18px; margin-bottom: 10px; }
      .lo-desc  { font-size: 14px; margin-bottom: 28px; }
      .lo-btns  { flex-direction: column-reverse; gap: 10px; }
      .lo-btns button { height: 52px; font-size: 15px; border-radius: 12px; }
    }

    /* ── mobile ──────────────────────────────────────── */
    @media (max-width: 1024px) {
      .topbar { padding: 0 12px; min-height: 52px; }
      .topbar-sub { display: none; }
      .topbar-title { font-size: 14px; }
      .page-body { padding: 12px; }
      .stats-row {
        grid-template-columns: repeat(3, 1fr);
        gap: 8px; margin-bottom: 14px;
      }
      .stat-card { padding: 10px 12px; gap: 8px; }
      .stat-icon { width: 32px; height: 32px; font-size: 14px; border-radius: 7px; }
      .stat-val  { font-size: 18px; }
      .stat-lbl  { font-size: 11px; }
      .table-wrap { display: none; }
      .cards-wrap { display: block; }
    }
  `],
  template: `
    <div class="page">

    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-left">
        <button nz-button nzType="text" nzSize="small" (click)="voltar()">
          <span nz-icon nzType="arrow-left"></span> Voltar
        </button>
        <nz-divider nzType="vertical"></nz-divider>
        <span class="topbar-title">Excursões</span>
        <span class="topbar-sub">Gerencie as excursões</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button nz-button nzType="primary" nzSize="small" (click)="abrirCriar()">
          <span nz-icon nzType="plus"></span> Nova
        </button>
        <button nz-button nzType="text" style="color:#aaa" nzSize="small" (click)="confirmarLogout()">
          <span nz-icon nzType="logout"></span>
        </button>
      </div>
    </div>

    <div class="page-body">

    <!-- Stats -->
    <div class="stats-row" *ngIf="!carregando && excursoes.length > 0">
      <div class="stat-card">
        <div class="stat-icon" style="background:#e6f7ff; color:#1890ff">
          <span nz-icon nzType="car"></span>
        </div>
        <div>
          <div class="stat-val">{{ excursoes.length }}</div>
          <div class="stat-lbl">Total</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#f6ffed; color:#52c41a">
          <span nz-icon nzType="check-circle"></span>
        </div>
        <div>
          <div class="stat-val" style="color:#52c41a">{{ qtdAbertas }}</div>
          <div class="stat-lbl">Abertas</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#f5f5f5; color:#aaa">
          <span nz-icon nzType="clock-circle"></span>
        </div>
        <div>
          <div class="stat-val" style="color:#aaa">{{ qtdEncerradas }}</div>
          <div class="stat-lbl">Encerradas</div>
        </div>
      </div>
    </div>

    <!-- Tabela (desktop) -->
    <div class="table-wrap">
      <nz-spin *ngIf="carregando" nzTip="Carregando..." style="display:block; text-align:center; padding:48px" />
      <nz-table *ngIf="!carregando" #tb [nzData]="excursoes"
                [nzShowPagination]="excursoes.length > 10" nzSize="middle">
        <thead>
          <tr>
            <th>Excursão</th>
            <th nzWidth="120px">Data ida</th>
            <th nzWidth="120px">Valor</th>
            <th nzWidth="90px">Parcelas</th>
            <th nzWidth="100px">Veículo</th>
            <th nzWidth="100px">Assentos</th>
            <th nzWidth="90px">Inscritos</th>
            <th nzWidth="90px">Status</th>
            <th nzWidth="120px"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let e of tb.data">
            <td>
              <div class="nome-cell">{{ e.nome }}</div>
              <div class="destino-cell">
                <span nz-icon nzType="environment" style="color:#faad14; margin-right:4px; font-size:11px"></span>
                {{ e.destino }}
              </div>
            </td>
            <td style="color:#555">{{ e.dataIda | date:'dd/MM/yyyy':'UTC' }}</td>
            <td style="font-weight:600; color:#1890ff">{{ e.valor | brl }}</td>
            <td style="color:#555; text-align:center">{{ e.numParcelas }}x</td>
            <td style="color:#555; text-align:center">{{ rotuloVeiculo(e.tipoVeiculo) }}</td>
            <td style="color:#555; text-align:center">{{ e.totalAssentos }}</td>
            <td style="color:#52c41a; text-align:center; font-weight:600">{{ e.inscritos ?? 0 }}</td>
            <td>
              <nz-tag [nzColor]="e.status === 'aberta' ? 'success' : 'default'">
                {{ e.status === 'aberta' ? 'Aberta' : 'Encerrada' }}
              </nz-tag>
            </td>
            <td>
              <div class="actions">
                <button nz-button nzType="text" nzSize="small"
                        [disabled]="e.status === 'encerrada'"
                        [nz-tooltip]="e.status === 'encerrada' ? 'Excursão encerrada' : 'Editar'"
                        (click)="abrirEdicao(e)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" style="color:#fa8c16"
                        nz-popconfirm nzPopconfirmTitle="Encerrar esta excursão? Esta ação não pode ser desfeita."
                        nzPopconfirmPlacement="left" (nzOnConfirm)="encerrar(e)"
                        [disabled]="e.status === 'encerrada'"
                        [nz-tooltip]="e.status === 'encerrada' ? 'Já encerrada' : 'Encerrar'">
                  <span nz-icon nzType="close-circle"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" style="color:#ff4d4f"
                        nz-popconfirm nzPopconfirmTitle="Excluir esta excursão? Só é possível se nenhuma inscrição foi feita."
                        nzPopconfirmPlacement="left" (nzOnConfirm)="excluir(e)"
                        nz-tooltip="Excluir excursão">
                  <span nz-icon nzType="close"></span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </nz-table>
      <nz-empty *ngIf="!carregando && excursoes.length === 0"
        nzNotFoundContent="Nenhuma excursão cadastrada. Crie a primeira!" style="padding:48px" />
    </div>

    <!-- Cards (mobile) -->
    <div class="cards-wrap">
      <nz-spin *ngIf="carregando" style="display:block; text-align:center; padding:48px" />
      <nz-empty *ngIf="!carregando && excursoes.length === 0"
        nzNotFoundContent="Nenhuma excursão. Toque em + Nova para começar."
        style="padding:48px; background:#fff; border-radius:12px" />

      <div *ngFor="let e of excursoes" class="cc" [class.cc-encerrada]="e.status === 'encerrada'">

        <!-- Cabeçalho -->
        <div class="cc-head">
          <div style="flex:1; min-width:0">
            <div class="cc-nome">{{ e.nome }}</div>
            <div class="cc-destino">
              <span nz-icon nzType="environment" style="color:#faad14"></span>
              {{ e.destino }}
            </div>
          </div>
          <nz-tag [nzColor]="e.status === 'aberta' ? 'success' : 'default'" style="flex-shrink:0">
            {{ e.status === 'aberta' ? 'Aberta' : 'Encerrada' }}
          </nz-tag>
        </div>

        <!-- Meta grid -->
        <div class="cc-meta">
          <div class="cc-meta-item">
            <span class="cc-meta-lbl">Data ida</span>
            <span class="cc-meta-val">{{ e.dataIda | date:'dd/MM/yyyy':'UTC' }}</span>
          </div>
          <div class="cc-meta-item">
            <span class="cc-meta-lbl">Valor</span>
            <span class="cc-meta-val blue">{{ e.valor | brl }}</span>
          </div>
          <div class="cc-meta-item">
            <span class="cc-meta-lbl">Parcelas</span>
            <span class="cc-meta-val">{{ e.numParcelas }}x</span>
          </div>
          <div class="cc-meta-item">
            <span class="cc-meta-lbl">Veículo</span>
            <span class="cc-meta-val">{{ rotuloVeiculo(e.tipoVeiculo) }}</span>
          </div>
          <div class="cc-meta-item">
            <span class="cc-meta-lbl">Assentos</span>
            <span class="cc-meta-val">{{ e.totalAssentos }}</span>
          </div>
          <div class="cc-meta-item">
            <span class="cc-meta-lbl">Inscritos</span>
            <span class="cc-meta-val sold">{{ e.inscritos ?? 0 }}</span>
          </div>
        </div>

        <!-- Ações -->
        <div class="cc-foot">
          <button nz-button nzType="text"
                  [disabled]="e.status === 'encerrada'"
                  (click)="abrirEdicao(e)">
            <span nz-icon nzType="edit"></span> Editar
          </button>
          <button nz-button nzType="text" style="color:#fa8c16"
                  nz-popconfirm
                  nzPopconfirmTitle="Encerrar esta excursão? Não poderá ser desfeito."
                  nzPopconfirmPlacement="top"
                  (nzOnConfirm)="encerrar(e)"
                  [disabled]="e.status === 'encerrada'">
            <span nz-icon nzType="close-circle"></span> Encerrar
          </button>
          <button nz-button nzType="text" style="color:#ff4d4f"
                  nz-popconfirm
                  nzPopconfirmTitle="Excluir excursão? Só é possível sem inscrições."
                  nzPopconfirmPlacement="top"
                  (nzOnConfirm)="excluir(e)">
            <span nz-icon nzType="delete"></span> Excluir
          </button>
        </div>
      </div>
    </div>

    <!-- ══ Modal: Nova Excursão ══ -->
    <nz-modal
      [(nzVisible)]="criarVisivel"
      nzTitle="Nova Excursão"
      [nzOkLoading]="salvando"
      (nzOnOk)="salvarCriar()"
      (nzOnCancel)="criarVisivel = false"
      nzOkText="Criar Excursão"
      nzCancelText="Cancelar"
      nzWidth="560px">
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="criarForm" nzLayout="vertical">

          <nz-form-item>
            <nz-form-label nzRequired>Nome da excursão</nz-form-label>
            <nz-form-control nzErrorTip="Informe o nome">
              <input nz-input formControlName="nome" placeholder="Ex: Excursão Aparecida 2026" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Destino</nz-form-label>
            <nz-form-control nzErrorTip="Informe o destino">
              <input nz-input formControlName="destino" placeholder="Ex: Aparecida do Norte - SP" />
            </nz-form-control>
          </nz-form-item>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <nz-form-item>
              <nz-form-label nzRequired>Data de ida</nz-form-label>
              <nz-form-control nzErrorTip="Informe a data">
                <nz-date-picker formControlName="dataIda" nzFormat="dd/MM/yyyy"
                                style="width:100%" [nzDisabledDate]="dataPassada" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>Data de volta</nz-form-label>
              <nz-form-control>
                <nz-date-picker formControlName="dataVolta" nzFormat="dd/MM/yyyy"
                                style="width:100%" [nzDisabledDate]="dataPassada" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px">
            <nz-form-item>
              <nz-form-label nzRequired>Valor</nz-form-label>
              <nz-form-control [nzValidateStatus]="criarForm.get('valor')!" nzErrorTip="Informe o valor">
                <nz-input-group nzPrefix="R$">
                  <input nz-input type="text" inputmode="numeric" placeholder="0,00"
                         [value]="valorDisplay"
                         (input)="mascaraValorBRL($event)" />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>Nº de parcelas</nz-form-label>
              <nz-form-control nzErrorTip="Informe as parcelas">
                <nz-input-number formControlName="numParcelas"
                  [nzMin]="1" [nzStep]="1" [nzPrecision]="0" style="width:100%" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>Total de assentos</nz-form-label>
              <nz-form-control nzErrorTip="Informe o total">
                <nz-input-number formControlName="totalAssentos"
                  [nzMin]="1" [nzStep]="1" [nzPrecision]="0" style="width:100%" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <nz-form-item>
            <nz-form-label nzRequired>Tipo de veículo</nz-form-label>
            <nz-form-control nzErrorTip="Selecione o veículo">
              <nz-select formControlName="tipoVeiculo" nzPlaceHolder="Selecione">
                <nz-option nzValue="onibus" nzLabel="Ônibus (4 por fileira)"></nz-option>
                <nz-option nzValue="van" nzLabel="Van (3 por fileira)"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-alert *ngIf="avisoDivisao" nzType="warning" nzShowIcon
            nzMessage="Divisão quebrada: o valor por parcela não é exato."
            style="margin-top:4px" />

          <div *ngIf="valorParcelaCriar > 0 && !avisoDivisao"
               style="background:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;padding:10px 14px;margin-top:4px;font-size:13px;color:#389e0d">
            <span nz-icon nzType="check-circle" style="margin-right:6px"></span>
            Valor por parcela: <strong>{{ valorParcelaCriar | brl }}</strong>
          </div>
        </form>
      </ng-container>
    </nz-modal>

    <!-- ══ Modal: Editar Excursão ══ -->
    <nz-modal
      [(nzVisible)]="editarVisivel"
      nzTitle="Editar Excursão"
      [nzOkLoading]="salvando"
      (nzOnOk)="salvarEdicao()"
      (nzOnCancel)="editarVisivel = false"
      nzOkText="Salvar"
      nzCancelText="Cancelar"
      nzWidth="520px"
      nzCentered
      [nzBodyStyle]="{ 'max-height': 'calc(100vh - 180px)', 'overflow-y': 'auto' }">
      <ng-container *nzModalContent>
        <div class="readonly-info">
          <span nz-icon nzType="warning" style="margin-right:6px"></span>
          <strong>Valor</strong> e <strong>número de parcelas</strong> não podem ser alterados após a criação — impactariam as inscrições já feitas.
        </div>
        <form nz-form [formGroup]="editForm" nzLayout="vertical">

          <nz-form-item>
            <nz-form-label nzRequired>Nome da excursão</nz-form-label>
            <nz-form-control nzErrorTip="Informe o nome">
              <input nz-input formControlName="nome" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Destino</nz-form-label>
            <nz-form-control nzErrorTip="Informe o destino">
              <input nz-input formControlName="destino" />
            </nz-form-control>
          </nz-form-item>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <nz-form-item>
              <nz-form-label nzRequired>Data de ida</nz-form-label>
              <nz-form-control nzErrorTip="Informe a data">
                <nz-date-picker formControlName="dataIda" nzFormat="dd/MM/yyyy"
                                style="width:100%" [nzDisabledDate]="dataPassada" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>Data de volta</nz-form-label>
              <nz-form-control>
                <nz-date-picker formControlName="dataVolta" nzFormat="dd/MM/yyyy"
                                style="width:100%" [nzDisabledDate]="dataPassada" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <nz-form-item>
              <nz-form-label>Valor</nz-form-label>
              <nz-form-control>
                <nz-input-group nzPrefix="R$">
                  <input nz-input [value]="editandoExcursao?.valor | brl" disabled />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>Nº de parcelas</nz-form-label>
              <nz-form-control>
                <input nz-input [value]="editandoExcursao?.numParcelas + 'x'" disabled />
              </nz-form-control>
            </nz-form-item>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <nz-form-item>
              <nz-form-label nzRequired>Tipo de veículo</nz-form-label>
              <nz-form-control nzErrorTip="Selecione o veículo">
                <nz-select formControlName="tipoVeiculo" nzPlaceHolder="Selecione">
                  <nz-option nzValue="onibus" nzLabel="Ônibus (4 por fileira)"></nz-option>
                  <nz-option nzValue="van" nzLabel="Van (3 por fileira)"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>Total de assentos</nz-form-label>
              <nz-form-control [nzErrorTip]="'Mínimo permitido: ' + (editandoExcursao?.inscritos || 1)">
                <nz-input-number formControlName="totalAssentos"
                  [nzMin]="editandoExcursao?.inscritos || 1"
                  [nzStep]="1" [nzPrecision]="0" style="width:100%" />
              </nz-form-control>
            </nz-form-item>
          </div>

          <div *ngIf="(editandoExcursao?.inscritos ?? 0) > 0"
               style="font-size:12px; color:#888; margin-top:4px">
            <span nz-icon nzType="warning" style="color:#faad14; margin-right:4px"></span>
            {{ editandoExcursao?.inscritos }} inscrição(ões) já feitas — não é possível reduzir abaixo desse valor.
          </div>

        </form>
      </ng-container>
    </nz-modal>

    </div><!-- /page-body -->
    </div><!-- /page -->

    <!-- Confirmação de logout -->
    <ng-container *ngIf="logoutVisivel">
      <div class="logout-overlay"
           role="button" tabindex="-1" aria-label="Fechar"
           (click)="logoutVisivel = false"
           (keydown.escape)="logoutVisivel = false"></div>
      <div class="logout-card">
        <div class="lo-icon"><span nz-icon nzType="logout" nzTheme="outline"></span></div>
        <div class="lo-title">Sair da conta</div>
        <div class="lo-desc">Tem certeza que deseja sair?<br>Você precisará fazer login novamente.</div>
        <div class="lo-btns">
          <button class="lo-cancel"  (click)="logoutVisivel = false">Cancelar</button>
          <button class="lo-confirm" (click)="auth.logout()">Sair</button>
        </div>
      </div>
    </ng-container>
  `,
})
export class ExcursoesListComponent implements OnInit {
  auth = inject(AuthService);
  excursaoAtiva = inject(ExcursaoAtivaService);
  private router = inject(Router);

  excursoes: Excursao[] = [];
  carregando = true;
  salvando = false;
  avisoDivisao = false;
  valorDisplay = '';

  criarVisivel = false;
  editarVisivel = false;
  editandoExcursao: Excursao | null = null;
  logoutVisivel = false;

  criarForm!: ReturnType<typeof this.buildCriarForm>;
  editForm!:  ReturnType<typeof this.buildEditForm>;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private message: NzMessageService,
  ) {
    this.criarForm = this.buildCriarForm();
    this.editForm  = this.buildEditForm();
    this.criarForm.valueChanges.subscribe(() => this.verificarDivisao());
  }

  private buildCriarForm() {
    return this.fb.group({
      nome:          ['', Validators.required],
      destino:       ['', Validators.required],
      dataIda:       [null as Date | null, Validators.required],
      dataVolta:     [null as Date | null],
      valor:         [null as number | null, [Validators.required, Validators.min(0.01)]],
      numParcelas:   [null as number | null, [Validators.required, Validators.min(1)]],
      tipoVeiculo:   [null as TipoVeiculo | null, Validators.required],
      totalAssentos: [null as number | null, [Validators.required, Validators.min(1)]],
    });
  }

  private buildEditForm() {
    return this.fb.group({
      nome:          ['', Validators.required],
      destino:       ['', Validators.required],
      dataIda:       [null as Date | null, Validators.required],
      dataVolta:     [null as Date | null],
      tipoVeiculo:   [null as TipoVeiculo | null, Validators.required],
      totalAssentos: [null as number | null, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit() { this.carregar(); }

  carregar() {
    this.carregando = true;
    this.api.get<Excursao[]>('excursoes').subscribe({
      next: (data) => { this.excursoes = data; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  get qtdAbertas()    { return this.excursoes.filter(e => e.status === 'aberta').length; }
  get qtdEncerradas() { return this.excursoes.filter(e => e.status === 'encerrada').length; }

  rotuloVeiculo(t: TipoVeiculo): string {
    return t === 'van' ? 'Van' : 'Ônibus';
  }

  get valorParcelaCriar(): number {
    const { valor, numParcelas } = this.criarForm.value;
    if (!valor || !numParcelas || numParcelas <= 0) return 0;
    return valor / numParcelas;
  }

  verificarDivisao() {
    const { valor, numParcelas } = this.criarForm.value;
    this.avisoDivisao = !!(valor && numParcelas && numParcelas > 0 &&
      (valor * 100) % numParcelas !== 0);
  }

  dataPassada = (d: Date) => d < new Date(new Date().setHours(0, 0, 0, 0));

  mascaraValorBRL(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    const fmt = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    input.value = fmt;
    this.valorDisplay = fmt;
    this.criarForm.patchValue({ valor: num > 0 ? num : null });
  }

  confirmarLogout() { this.logoutVisivel = true; }

  voltar() { this.router.navigate(['/selecionar-excursao']); }

  abrirCriar() {
    this.criarForm.reset();
    this.valorDisplay = '';
    this.avisoDivisao = false;
    this.criarVisivel = true;
  }

  salvarCriar() {
    if (this.criarForm.invalid) {
      Object.values(this.criarForm.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
      return;
    }
    const v = this.criarForm.value;
    this.salvando = true;
    this.api.post<Excursao>('excursoes', {
      nome:          v.nome,
      destino:       v.destino,
      dataIda:       localDateStr(v.dataIda as Date),
      dataVolta:     v.dataVolta ? localDateStr(v.dataVolta as Date) : undefined,
      valor:         v.valor,
      numParcelas:   v.numParcelas,
      tipoVeiculo:   v.tipoVeiculo,
      totalAssentos: v.totalAssentos,
    }).subscribe({
      next: () => {
        this.message.success('Excursão criada com sucesso!');
        this.criarVisivel = false;
        this.carregar();
        this.salvando = false;
      },
      error: (err) => {
        this.message.error(err?.error?.message ?? 'Erro ao criar excursão');
        this.salvando = false;
      },
    });
  }

  abrirEdicao(e: Excursao) {
    this.editandoExcursao = e;
    this.editForm.reset({
      nome:          e.nome,
      destino:       e.destino,
      dataIda:       new Date(e.dataIda.slice(0, 10) + 'T00:00:00'),
      dataVolta:     e.dataVolta ? new Date(e.dataVolta.slice(0, 10) + 'T00:00:00') : null,
      tipoVeiculo:   e.tipoVeiculo,
      totalAssentos: e.totalAssentos,
    });
    this.editarVisivel = true;
  }

  salvarEdicao() {
    if (this.editForm.invalid) {
      Object.values(this.editForm.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
      return;
    }
    const v = this.editForm.value;
    this.salvando = true;
    this.api.patch<Excursao>(`excursoes/${this.editandoExcursao!.id}`, {
      nome:          v.nome,
      destino:       v.destino,
      dataIda:       localDateStr(v.dataIda as Date),
      dataVolta:     v.dataVolta ? localDateStr(v.dataVolta as Date) : null,
      tipoVeiculo:   v.tipoVeiculo,
      totalAssentos: v.totalAssentos,
    }).subscribe({
      next: () => {
        this.message.success('Excursão atualizada!');
        this.editarVisivel = false;
        this.carregar();
        this.salvando = false;
      },
      error: (err) => {
        this.message.error(err?.error?.message ?? 'Erro ao atualizar excursão');
        this.salvando = false;
      },
    });
  }

  encerrar(e: Excursao) {
    this.api.patch<Excursao>(`excursoes/${e.id}/encerrar`, {}).subscribe({
      next: () => {
        this.message.success('Excursão encerrada.');
        if (this.excursaoAtiva.excursao()?.id === e.id) this.excursaoAtiva.limpar();
        this.carregar();
      },
      error: (err) => this.message.error(err?.error?.message ?? 'Erro ao encerrar'),
    });
  }

  excluir(e: Excursao) {
    this.api.delete<unknown>(`excursoes/${e.id}`).subscribe({
      next: () => {
        this.message.success('Excursão excluída.');
        if (this.excursaoAtiva.excursao()?.id === e.id) this.excursaoAtiva.limpar();
        this.carregar();
      },
      error: (err) => this.message.error(err?.error?.message ?? 'Erro ao excluir'),
    });
  }
}
