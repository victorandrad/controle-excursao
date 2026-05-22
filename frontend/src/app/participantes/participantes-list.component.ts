import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ApiService } from '../shared/services/api.service';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';
import { Inscricao, Parcela, Participante } from '../shared/models';

@Component({
  selector: 'app-participantes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzFormModule,
    NzIconModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzDividerModule,
    NzSwitchModule,
  ],
  styles: [`
    /* ── page header ───────────────────────────────── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0 16px;
      margin-bottom: 0;
    }
    .page-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
    .page-header p  { margin: 0; font-size: 13px; color: #888; }

    /* ── filter bar ────────────────────────────────── */
    .filter-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      background: #fff; border: 1px solid #f0f0f0; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 12px;
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    /* ── desktop table ─────────────────────────────── */
    .avatar-cell {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #1890ff, #096dd9);
      color: #fff; font-weight: 700; font-size: 13px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .nome-col { font-weight: 500; }
    .meta-col { font-size: 13px; color: #888; }

    /* ── carnê card (modal) ────────────────────────── */
    .carne-card {
      border: 1px solid #f0f0f0; border-radius: 10px;
      padding: 12px 16px; margin-bottom: 10px; background: #fafafa;
    }
    .carne-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .carne-numero { font-size: 17px; font-weight: bold; color: #1890ff; }
    .parcelas-grid { display: flex; flex-wrap: wrap; gap: 4px; }
    .parcela-dot {
      width: 28px; height: 28px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; border: 1px solid #d9d9d9;
    }
    .parcela-dot.paga     { background: #f6ffed; color: #52c41a; border-color: #b7eb8f; }
    .parcela-dot.pendente { background: #fff; color: #ccc; }

    /* ── mobile card list ──────────────────────────── */
    .card-list { display: none; }

    .p-item {
      display: flex; align-items: center; gap: 12px;
      padding: 13px 0; border-bottom: 1px solid #f5f5f5;
      cursor: pointer; transition: background 0.12s;
    }
    .p-item:last-child { border-bottom: none; }
    .p-item:active { background: #f5f9ff; margin: 0 -12px; padding: 13px 12px; border-radius: 8px; }

    .p-avatar {
      width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #1890ff, #096dd9);
      color: #fff; font-weight: 700; font-size: 15px;
      display: flex; align-items: center; justify-content: center;
    }
    .p-info { flex: 1; min-width: 0; }
    .p-nome {
      font-size: 15px; font-weight: 600; color: #1a1a1a;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .p-meta {
      font-size: 12px; color: #aaa; margin-top: 3px;
      display: flex; flex-wrap: wrap; gap: 8px;
    }
    .p-meta-item { display: flex; align-items: center; gap: 3px; }

    .p-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .p-btn {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; border: 1.5px solid #e8e8e8;
      background: #fff; cursor: pointer; color: #555;
      transition: all 0.15s; -webkit-tap-highlight-color: transparent;
    }
    .p-btn:active { background: #e6f4ff; border-color: #91caff; color: #1890ff; }
    .p-btn.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
    .p-btn.primary:active { background: #096dd9; }

    /* ══════════════════════════════════════════════════
       MOBILE
    ══════════════════════════════════════════════════ */
    @media (max-width: 1024px) {

      /* ── page header ── */
      .page-header { margin-bottom: 12px; }
      .page-header h2 { font-size: 17px; }

      /* ── filter bar ── */
      .filter-bar {
        padding: 10px 12px; gap: 8px; margin-bottom: 10px;
        border-radius: 12px;
      }
      .filter-bar nz-input-group { flex: 1 1 100%; }
      .filter-row { display: flex; gap: 8px; flex: 0 0 100%; align-items: center; }

      /* ── show card list, hide table ── */
      .table-wrap { display: none; }
      .card-list  { display: block; background: #fff; border-radius: 14px; padding: 0 12px; border: 1px solid #f0f0f0; }

    }
  `],
  template: `
    <!-- Cabeçalho da página -->
    <div class="page-header">
      <div>
        <h2>Participantes</h2>
        <p *ngIf="!carregando">{{ participantes.length }} cadastrado(s)</p>
      </div>
      <button nz-button nzType="primary" (click)="abrirModal()">
        <span nz-icon nzType="plus"></span> Novo
      </button>
    </div>

    <!-- Barra de filtros -->
    <div class="filter-bar">
      <nz-input-group [nzSuffix]="sufixo" style="flex:1; min-width:0">
        <input nz-input [(ngModel)]="busca" [ngModelOptions]="{standalone:true}"
               placeholder="Buscar por nome, CPF ou telefone"
               (input)="onBuscaInput($event)" />
      </nz-input-group>
      <ng-template #sufixo><span nz-icon nzType="search"></span></ng-template>

      <div class="filter-row">
        <button nz-button
                [nzType]="somenteQuitados ? 'primary' : 'default'"
                (click)="somenteQuitados = !somenteQuitados; carregar()">
          <span nz-icon nzType="check-circle"
                [style.color]="somenteQuitados ? '#fff' : '#52c41a'"></span>
          Quitados
        </button>
        <button nz-button nzType="link" nzDanger
                *ngIf="busca || somenteQuitados"
                (click)="limparFiltros()">
          <span nz-icon nzType="close-circle"></span> Limpar
        </button>
        <span style="margin-left:auto; font-size:13px; color:#aaa" *ngIf="!carregando">
          {{ participantes.length }} resultado(s)
        </span>
      </div>
    </div>

    <!-- Tabela (desktop) -->
    <div class="table-wrap"
         style="background:#fff; border-radius:8px; border:1px solid #f0f0f0; overflow:hidden">
      <nz-table #tb [nzData]="participantes" [nzLoading]="carregando" nzSize="middle">
        <thead>
          <tr>
            <th nzWidth="46px"></th>
            <th>Nome</th>
            <th nzWidth="130px">CPF</th>
            <th nzWidth="130px">RG</th>
            <th nzWidth="140px">Telefone</th>
            <th nzWidth="100px"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of tb.data">
            <td style="text-align:center">
              <div class="avatar-cell">{{ iniciais(p.nome) }}</div>
            </td>
            <td class="nome-col">{{ p.nome }}</td>
            <td class="meta-col">{{ p.cpf || '—' }}</td>
            <td class="meta-col">{{ p.rg || '—' }}</td>
            <td class="meta-col">{{ p.telefone || '—' }}</td>
            <td>
              <div style="display:flex; gap:6px; align-items:center">
                <button nz-button nzSize="small" nzType="default" (click)="abrirEdicao(p)">
                  <span nz-icon nzType="edit"></span>
                </button>
                <button nz-button nzSize="small" nzType="default" (click)="verInscricoes(p)">
                  <span nz-icon nzType="profile"></span> Inscrições
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </nz-table>
    </div>

    <!-- Lista em cards (mobile) -->
    <div class="card-list">
      <nz-spin *ngIf="carregando" style="display:block; text-align:center; padding:40px" />
      <ng-container *ngIf="!carregando">
        <div *ngIf="participantes.length === 0"
             style="text-align:center; padding:40px 0; color:#ccc; font-size:14px">
          Nenhum participante encontrado
        </div>
        <div *ngFor="let p of participantes" class="p-item">
          <div class="p-avatar">{{ iniciais(p.nome) }}</div>
          <div class="p-info">
            <div class="p-nome">{{ p.nome }}</div>
            <div class="p-meta">
              <span class="p-meta-item" *ngIf="p.cpf">
                <span nz-icon nzType="idcard" style="font-size:11px"></span>{{ p.cpf }}
              </span>
              <span class="p-meta-item" *ngIf="p.telefone">
                <span nz-icon nzType="phone" style="font-size:11px"></span>{{ p.telefone }}
              </span>
              <span *ngIf="!p.cpf && !p.telefone" style="color:#ddd">Sem contato</span>
            </div>
          </div>
          <div class="p-actions">
            <button class="p-btn" (click)="abrirEdicao(p)">
              <span nz-icon nzType="edit"></span>
            </button>
            <button class="p-btn primary" (click)="verInscricoes(p)">
              <span nz-icon nzType="profile"></span>
            </button>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- Modal: novo / editar participante -->
    <nz-modal
      [(nzVisible)]="modalVisivel"
      [nzTitle]="editando ? 'Editar Participante' : 'Novo Participante'"
      [nzOkLoading]="salvando"
      (nzOnOk)="salvar()"
      (nzOnCancel)="fecharModal()"
      [nzOkText]="editando ? 'Salvar' : 'Cadastrar'"
      nzCancelText="Cancelar"
      nzWidth="480px">
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="form" nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Nome completo</nz-form-label>
            <nz-form-control nzErrorTip="Informe o nome">
              <input nz-input formControlName="nome" placeholder="Nome completo" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>CPF</nz-form-label>
            <nz-form-control nzErrorTip="CPF inválido — verifique os dígitos">
              <input *ngIf="!editando" nz-input formControlName="cpf"
                     placeholder="000.000.000-00" maxlength="14"
                     (input)="mascaraCpf($event)" />
              <input *ngIf="editando" nz-input [value]="editando.cpf || '—'"
                     disabled style="background:#f5f5f5; color:#aaa; cursor:not-allowed" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>RG</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="rg" placeholder="Número do RG" maxlength="20" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Telefone</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="telefone" placeholder="(00) 00000-0000"
                     maxlength="15" (input)="mascaraTelefone($event)" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>

    <!-- Modal: inscrições do participante -->
    <nz-modal
      [(nzVisible)]="inscricoesModalVisivel"
      [nzTitle]="'Inscrições — ' + (inscricoesParticipante?.nome ?? '')"
      [nzFooter]="null"
      nzWidth="500px"
      (nzOnCancel)="inscricoesModalVisivel = false">
      <ng-container *nzModalContent>
        <nz-spin *ngIf="carregandoInscricoes"
                 style="display:block; text-align:center; padding:32px" />

        <nz-empty *ngIf="!carregandoInscricoes && inscricoes.length === 0"
                  nzNotFoundContent="Nenhuma inscrição nesta excursão" />

        <ng-container *ngIf="!carregandoInscricoes && inscricoes.length > 0">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px">
            <span style="color:#888; font-size:13px">
              Excursão: <strong>{{ excursaoAtiva.excursao()?.nome }}</strong>
            </span>
            <div style="display:flex; gap:8px">
              <nz-tag nzColor="success">{{ inscricoesQuitadas }} quitada(s)</nz-tag>
              <nz-tag>{{ inscricoes.length }} total</nz-tag>
            </div>
          </div>
          <div *ngFor="let c of inscricoes" class="carne-card">
            <div class="carne-header">
              <span class="carne-numero">{{ rotuloAssento(c) }}</span>
              <nz-tag [nzColor]="c.quitado ? 'success' : parcelasPagas(c) > 0 ? 'processing' : 'default'">
                {{ c.quitado ? 'Quitado' : parcelasPagas(c) + '/' + c.parcelas.length + ' pagas' }}
              </nz-tag>
            </div>
            <div class="parcelas-grid">
              <div *ngFor="let p of c.parcelas"
                   class="parcela-dot"
                   [class.paga]="p.status === 'paga'"
                   [class.pendente]="p.status === 'pendente'"
                   [title]="'Parcela ' + p.numero + ': ' + p.status">
                {{ p.numero }}
              </div>
            </div>
          </div>
        </ng-container>
      </ng-container>
    </nz-modal>
  `,
})
export class ParticipantesListComponent implements OnInit, OnDestroy {
  excursaoAtiva = inject(ExcursaoAtivaService);

  participantes: Participante[] = [];
  carregando = true;
  modalVisivel = false;
  salvando = false;
  busca = '';
  somenteQuitados = false;
  form!: ReturnType<typeof this.criarForm>;

  editando: Participante | null = null;

  private buscaSubject = new Subject<string>();
  private buscaSub!: Subscription;

  inscricoesModalVisivel = false;
  inscricoesParticipante: Participante | null = null;
  inscricoes: InscricaoComParcelas[] = [];
  carregandoInscricoes = false;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private message: NzMessageService,
  ) {
    this.form = this.criarForm();
  }

  private criarForm() {
    return this.fb.group({
      nome:     ['', Validators.required],
      cpf:      ['', (control: AbstractControl) => {
        const v = control.value;
        if (!v) return null;
        return this.cpfValido(v) ? null : { cpfInvalido: true };
      }],
      rg:       [''],
      telefone: [''],
    });
  }

  private cpfValido(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    const calc = (len: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i);
      const rem = (sum * 10) % 11;
      return rem === 10 ? 0 : rem;
    };
    return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10]);
  }

  mascaraCpf(event: Event) {
    const el = event.target as HTMLInputElement;
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    el.value = v;
    this.form.get('cpf')!.setValue(v, { emitEvent: false });
  }

  mascaraTelefone(event: Event) {
    const el = event.target as HTMLInputElement;
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length === 11)    v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length >= 7) v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
    else if (v.length >= 3) v = v.replace(/(\d{2})(\d+)/, '($1) $2');
    else if (v.length > 0)  v = '(' + v;
    el.value = v;
    this.form.get('telefone')!.setValue(v, { emitEvent: false });
  }

  ngOnInit() {
    this.carregar();

    const excursaoId = this.excursaoAtiva.excursao()?.id;
    this.buscaSub = this.buscaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(busca => {
        this.carregando = true;
        const params: Record<string, string> = {};
        if (busca) params['busca'] = busca;
        if (this.somenteQuitados && excursaoId) {
          params['excursaoId'] = excursaoId;
          params['somenteQuitados'] = 'true';
        }
        return this.api.get<Participante[]>('participantes', Object.keys(params).length ? params : undefined);
      }),
    ).subscribe({
      next: (data) => { this.participantes = data; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  ngOnDestroy() { this.buscaSub?.unsubscribe(); }

  onBusca() { this.buscaSubject.next(this.busca); }

  onBuscaInput(event: Event) {
    this.busca = (event.target as HTMLInputElement).value;
    this.buscaSubject.next(this.busca);
  }

  limparFiltros() { this.busca = ''; this.somenteQuitados = false; this.carregar(); }

  carregar() {
    this.carregando = true;
    const excursaoId = this.excursaoAtiva.excursao()?.id;
    const params: Record<string, string> = {};
    if (this.busca) params['busca'] = this.busca;
    if (this.somenteQuitados && excursaoId) {
      params['excursaoId'] = excursaoId;
      params['somenteQuitados'] = 'true';
    }
    this.api.get<Participante[]>('participantes', Object.keys(params).length ? params : undefined).subscribe({
      next: (data) => { this.participantes = data; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  iniciais(nome: string): string {
    return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  verInscricoes(participante: Participante) {
    this.inscricoesParticipante = participante;
    this.inscricoes = [];
    this.carregandoInscricoes = true;
    this.inscricoesModalVisivel = true;
    const excursaoId = this.excursaoAtiva.excursao()?.id;
    this.api.get<InscricaoComParcelas[]>('inscricoes/participante', { excursaoId: excursaoId!, participanteId: participante.id }).subscribe({
      next: (data) => { this.inscricoes = data; this.carregandoInscricoes = false; },
      error: () => { this.carregandoInscricoes = false; },
    });
  }

  get inscricoesQuitadas() { return this.inscricoes.filter(c => c.quitado).length; }
  parcelasPagas(c: InscricaoComParcelas) { return c.parcelas.filter((p: Parcela) => p.status === 'paga').length; }
  rotuloAssento(c: InscricaoComParcelas): string {
    return c.numeroAssento != null ? `Assento ${c.numeroAssento}` : 'Sem assento';
  }

  abrirModal() { this.editando = null; this.form.reset(); this.modalVisivel = true; }
  fecharModal() { this.modalVisivel = false; this.editando = null; }

  abrirEdicao(p: Participante) {
    this.editando = p;
    this.form.reset();
    this.form.patchValue({ nome: p.nome, rg: p.rg ?? '', telefone: p.telefone ?? '' });
    this.modalVisivel = true;
  }

  salvar() {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => { c.markAsDirty(); c.updateValueAndValidity(); });
      return;
    }
    const v = this.form.value;
    this.salvando = true;

    if (this.editando) {
      const body: ParticipanteBody = { nome: v.nome ?? '' };
      if (v.rg !== null) body.rg = v.rg;
      if (v.telefone !== null) body.telefone = v.telefone;
      this.api.patch<Participante>(`participantes/${this.editando.id}`, body).subscribe({
        next: () => {
          this.message.success('Participante atualizado!');
          this.fecharModal(); this.carregar(); this.salvando = false;
        },
        error: (err) => {
          this.message.error(err?.error?.message ?? 'Erro ao atualizar');
          this.salvando = false;
        },
      });
    } else {
      const body: ParticipanteBody = { nome: v.nome ?? '' };
      if (v.cpf)      body.cpf      = v.cpf;
      if (v.rg)       body.rg       = v.rg;
      if (v.telefone) body.telefone = v.telefone;
      this.api.post<Participante>('participantes', body).subscribe({
        next: () => {
          this.message.success('Participante cadastrado!');
          this.fecharModal(); this.carregar(); this.salvando = false;
        },
        error: (err) => {
          this.message.error(err?.error?.message ?? 'Erro ao cadastrar');
          this.salvando = false;
        },
      });
    }
  }
}

interface InscricaoComParcelas extends Inscricao {
  parcelas: Parcela[];
  quitado?: boolean;
}

interface ParticipanteBody {
  nome: string;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
}
