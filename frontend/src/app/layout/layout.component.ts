import { Component, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AuthService } from '../auth/auth.service';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';
import { ApiService } from '../shared/services/api.service';
import { Excursao } from '../shared/models';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NzIconModule,
    NzButtonModule,
    NzToolTipModule,
  ],
  styles: [`
    :host { display: block; }

    /* ── Root shell ──────────────────────────────────── */
    .app-root {
      display: flex;
      min-height: 100dvh;
      background: #f5f6fa;
    }

    /* ── Sidebar (desktop) ───────────────────────────── */
    .sider {
      position: fixed; top: 0; left: 0;
      height: 100dvh; display: flex; flex-direction: column;
      background: #fff;
      box-shadow: 2px 0 12px rgba(0,0,0,0.08);
      transition: width 0.22s ease;
      z-index: 200; overflow: hidden;
    }
    .sider.expanded  { width: 220px; }
    .sider.collapsed { width: 64px; }

    .logo {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px 18px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
    }
    .logo-icon {
      width: 36px; height: 36px; flex-shrink: 0;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: #fff; box-shadow: 0 2px 8px rgba(59,130,246,0.3);
    }
    .logo-text { overflow: hidden; }
    .logo-title { color: #1a1a1a; font-size: 15px; font-weight: 700; margin: 0; white-space: nowrap; }
    .logo-sub   { color: #888; font-size: 11px; margin: 0; white-space: nowrap; }

    .side-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 12px 8px; }
    .side-nav::-webkit-scrollbar { width: 0; }
    .nav-section { margin-bottom: 4px; }
    .nav-label {
      font-size: 10px; font-weight: 600; letter-spacing: 1px;
      color: #bbb; text-transform: uppercase; padding: 8px 10px 4px;
      white-space: nowrap; overflow: hidden;
    }
    .nav-item {
      display: flex; align-items: center; gap: 11px;
      padding: 9px 10px; border-radius: 8px; cursor: pointer;
      color: #555; font-size: 13.5px; font-weight: 500;
      text-decoration: none; transition: background 0.15s, color 0.15s;
      white-space: nowrap; overflow: hidden; position: relative; margin-bottom: 2px;
    }
    .nav-item:hover  { background: #eaecf0; color: #1a1a1a; }
    .nav-item.active { background: #dbeafe; color: #1d4ed8; }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
      width: 3px; background: #3b82f6; border-radius: 0 2px 2px 0;
    }
    .nav-icon {
      width: 32px; height: 32px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: 7px; font-size: 15px;
    }
    .nav-txt { flex: 1; }

    .sider-footer { flex-shrink: 0; border-top: 1px solid #f0f0f0; padding: 10px 8px; }
    .collapse-btn {
      display: flex; align-items: center; gap: 11px; padding: 9px 10px;
      border-radius: 8px; cursor: pointer; color: #888; font-size: 13px;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap; overflow: hidden; border: none; background: transparent; width: 100%;
    }
    .collapse-btn:hover { background: #eaecf0; color: #555; }
    .collapse-icon { width: 32px; height: 32px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 15px; }

    /* ── Main area ───────────────────────────────────── */
    .main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      transition: margin-left 0.22s ease;
    }

    /* ── Desktop header ──────────────────────────────── */
    .header {
      background: #fff; height: 56px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; border-bottom: 1px solid #f0f0f0;
      box-shadow: 0 1px 4px rgba(0,21,41,.06);
      position: sticky; top: 0; z-index: 10; flex-shrink: 0;
    }
    .header-left  { display: flex; align-items: center; gap: 10px; }
    .header-right { display: flex; align-items: center; gap: 14px; }
    .excursao-bloco { display: flex; flex-direction: column; gap: 2px; }
    .excursao-label { font-size: 11px; color: #aaa; line-height: 1; margin: 0; }
    .excursao-nome  { font-weight: 600; font-size: 14px; color: #1a1a1a; line-height: 1; margin: 0; }
    .user-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: #fff; font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0;
    }
    .user-name { font-size: 14px; color: #333; }

    /* ── Page content (desktop) ──────────────────────── */
    .page-content { flex: 1; }
    .content-wrap { margin: 20px; }

    /* ── Mobile-only: hidden on desktop ──────────────── */
    .mobile-topbar { display: none; }
    .bottom-tabs   { display: none; }

    /* ── Mobile: :host vira o viewport container ─────── */
    @media (max-width: 1024px) {
      :host {
        position: fixed !important;
        inset: 0 !important;
        overflow: hidden !important;
      }

      .app-root {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }
      .sider  { display: none !important; }
      .header { display: none !important; }

      .mobile-topbar {
        display: flex;
        position: absolute; top: 0; left: 0; right: 0; z-index: 100;
        height: 54px;
        background: #fff;
        border-bottom: 1px solid #f0f0f0;
        align-items: center;
        padding: 0 12px; gap: 10px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.06);
      }
      .mt-logo {
        flex-shrink: 0;
        width: 32px; height: 32px; border-radius: 9px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        display: flex; align-items: center; justify-content: center;
        font-size: 15px; color: #fff;
        box-shadow: 0 2px 6px rgba(59,130,246,0.25);
      }
      .mt-exc-btn {
        flex: 1; min-width: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: #f5f8ff;
        border: 1.5px solid #dbeafe;
        border-radius: 10px;
        padding: 4px 12px; height: 38px; gap: 1px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.15s, border-color 0.15s;
      }
      .mt-exc-btn:active { background: #dbeafe; border-color: #93c5fd; }
      .mt-exc-label {
        font-size: 9.5px; color: #94a3b8; font-weight: 500;
        line-height: 1; letter-spacing: 0.4px; text-transform: uppercase;
      }
      .mt-exc-row {
        display: flex; align-items: center; gap: 4px;
        max-width: 100%; overflow: hidden;
      }
      .mt-exc-nome {
        font-size: 13px; font-weight: 700; color: #1d4ed8;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        flex: 1; min-width: 0;
      }
      .mt-chevron { font-size: 10px; color: #60a5fa; flex-shrink: 0; }
      .mt-avatar {
        flex-shrink: 0;
        width: 32px; height: 32px; border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: #fff; font-weight: 700; font-size: 11px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; -webkit-tap-highlight-color: transparent;
      }

      .main-area {
        position: absolute;
        top: 54px; left: 0; right: 0;
        bottom: calc(58px + env(safe-area-inset-bottom, 0px));
        min-height: unset;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .page-content {
        flex: 1;
        overflow-y: auto; overflow-x: hidden;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        background: #f5f6fa;
      }
      .content-wrap { padding: 12px; }

      .bottom-tabs {
        display: flex;
        position: absolute; bottom: 0; left: 0; right: 0; z-index: 100;
        background: #fff;
        border-top: 1px solid #f0f0f0;
        box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        overflow: hidden;
        align-items: stretch;
      }
      .tab-item {
        flex: 1; min-width: 0; overflow: hidden;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 3px; padding: 10px 6px 8px;
        text-decoration: none; color: #aaa;
        font-size: 10px; font-weight: 500;
        transition: color 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .tab-item span:last-child {
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 100%;
      }
      .tab-item .tab-icon {
        font-size: 22px; line-height: 1; display: flex; align-items: center;
        transition: transform 0.15s; flex-shrink: 0;
      }
      .tab-item.tab-active { color: #3b82f6; }
      .tab-item.tab-active .tab-icon { transform: translateY(-1px); }
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
    .lo-handle, .lo-user-row, .lo-sep { display: none; }
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

    @keyframes lo-fade  { from { opacity: 0; }            to { opacity: 1; } }
    @keyframes lo-slide { from { transform: translateY(100%); } to { transform: translateY(0); } }

    @media (max-width: 1024px) {
      .logout-card {
        top: unset; left: 0; right: 0; bottom: 0;
        transform: none; width: 100%;
        border-radius: 20px 20px 0 0;
        padding: 0 20px calc(20px + env(safe-area-inset-bottom, 0px));
        text-align: left;
        animation: lo-slide 0.25s ease;
      }
      .lo-handle {
        display: block;
        width: 40px; height: 4px; border-radius: 2px;
        background: #e2e8f0; margin: 14px auto 22px;
      }
      .lo-user-row {
        display: flex; align-items: center; gap: 12px;
        background: #f8faff; border: 1px solid #dbeafe;
        border-radius: 12px; padding: 12px 14px;
        margin-bottom: 20px;
      }
      .lo-user-av {
        flex-shrink: 0;
        width: 42px; height: 42px; border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: #fff; font-weight: 700; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
      }
      .lo-user-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .lo-user-nome {
        font-size: 14px; font-weight: 600; color: #1a1a1a;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .lo-user-email {
        font-size: 12px; color: #94a3b8;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .lo-sep { display: block; height: 1px; background: #f0f4f8; margin-bottom: 20px; }
      .lo-icon   { display: none; }
      .lo-title  { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
      .lo-desc   { font-size: 13px; color: #94a3b8; line-height: 1.55; margin-bottom: 24px; }
      .lo-btns { flex-direction: column; gap: 12px; }
      .lo-btns button { width: 100%; flex: none; }
      .lo-confirm { height: 54px; font-size: 16px; border-radius: 14px; }
      .lo-cancel  {
        height: 50px; font-size: 15px; border-radius: 14px;
        background: #f1f5f9; color: #64748b;
      }
      .lo-btns button:active { opacity: 0.75; }
    }
  `],
  template: `
    <div class="app-root">

      <!-- ══ MOBILE TOP BAR ══ -->
      <div class="mobile-topbar">
        <div class="mt-logo">
          <span nz-icon nzType="car" nzTheme="outline"></span>
        </div>
        <button class="mt-exc-btn" (click)="trocarExcursao()">
          <span class="mt-exc-label">Excursão ativa</span>
          <span class="mt-exc-row">
            <span class="mt-exc-nome">{{ excursaoAtiva.excursao()?.nome }}</span>
            <span nz-icon nzType="down" class="mt-chevron"></span>
          </span>
        </button>
        <div class="mt-avatar"
             role="button" tabindex="0" aria-label="Conta"
             (click)="confirmarLogout()"
             (keydown.enter)="confirmarLogout()"
             (keydown.space)="$event.preventDefault(); confirmarLogout()">{{ iniciais }}</div>
      </div>

      <!-- ══ SIDEBAR (desktop) ══ -->
      <div class="sider"
           [class.expanded]="!collapsed"
           [class.collapsed]="collapsed">
        <div class="logo">
          <div class="logo-icon">
            <span nz-icon nzType="car" nzTheme="outline"></span>
          </div>
          <div class="logo-text" *ngIf="!collapsed">
            <p class="logo-title">Excursões</p>
            <p class="logo-sub">Sistema de excursões</p>
          </div>
        </div>
        <div class="side-nav">
          <div class="nav-section">
            <div class="nav-label" *ngIf="!collapsed">Geral</div>
            <a class="nav-item" routerLink="/participantes" routerLinkActive="active"
               [nz-tooltip]="collapsed ? 'Participantes' : ''" nzTooltipPlacement="right">
              <div class="nav-icon"><span nz-icon nzType="team"></span></div>
              <span class="nav-txt" *ngIf="!collapsed">Participantes</span>
            </a>
          </div>
          <div class="nav-section">
            <div class="nav-label" *ngIf="!collapsed">Operações</div>
            <a class="nav-item" routerLink="/inscricoes" routerLinkActive="active"
               [nz-tooltip]="collapsed ? 'Inscrições / Assentos' : ''" nzTooltipPlacement="right">
              <div class="nav-icon"><span nz-icon nzType="profile"></span></div>
              <span class="nav-txt" *ngIf="!collapsed">Inscrições / Assentos</span>
            </a>
            <a class="nav-item" routerLink="/pagamentos" routerLinkActive="active"
               [nz-tooltip]="collapsed ? 'Pagamentos' : ''" nzTooltipPlacement="right">
              <div class="nav-icon"><span nz-icon nzType="dollar"></span></div>
              <span class="nav-txt" *ngIf="!collapsed">Pagamentos</span>
            </a>
          </div>
          <div class="nav-section">
            <div class="nav-label" *ngIf="!collapsed">Análise</div>
            <a class="nav-item" routerLink="/relatorios" routerLinkActive="active"
               [nz-tooltip]="collapsed ? 'Relatórios' : ''" nzTooltipPlacement="right">
              <div class="nav-icon"><span nz-icon nzType="bar-chart"></span></div>
              <span class="nav-txt" *ngIf="!collapsed">Relatórios</span>
            </a>
          </div>
        </div>
        <div class="sider-footer">
          <button class="collapse-btn" (click)="collapsed = !collapsed"
                  [nz-tooltip]="collapsed ? 'Expandir menu' : ''" nzTooltipPlacement="right">
            <div class="collapse-icon">
              <span nz-icon [nzType]="collapsed ? 'menu-unfold' : 'menu-fold'"></span>
            </div>
            <span *ngIf="!collapsed" style="font-size:12px">Recolher menu</span>
          </button>
        </div>
      </div>

      <!-- ══ MAIN AREA ══ -->
      <div class="main-area"
           [style.margin-left]="isMobile ? '0' : (collapsed ? '64px' : '220px')">

        <!-- Desktop header -->
        <div class="header">
          <div class="header-left">
            <span nz-icon nzType="car" style="color:#3b82f6; font-size:16px"></span>
            <div class="excursao-bloco">
              <span class="excursao-label">Excursão ativa</span>
              <span class="excursao-nome">{{ excursaoAtiva.excursao()?.nome }}</span>
            </div>
            <button nz-button nzSize="small" nzType="link"
                    style="font-size:12px; padding:0 4px; color:#3b82f6"
                    (click)="trocarExcursao()">
              Trocar
            </button>
          </div>
          <div class="header-right">
            <span class="user-name">{{ auth.usuario()?.nome }}</span>
            <div class="user-avatar"
                 [nz-tooltip]="auth.usuario()?.email ?? ''"
                 nzTooltipPlacement="bottom">
              {{ iniciais }}
            </div>
            <button nz-button nzType="text" nzSize="small" style="color:#888" (click)="confirmarLogout()">
              <span nz-icon nzType="logout"></span>
              <span class="user-name">Sair</span>
            </button>
          </div>
        </div>

        <!-- Page content -->
        <div class="page-content">
          <div class="content-wrap">
            <router-outlet />
          </div>
        </div>
      </div>

      <!-- ══ MOBILE BOTTOM TABS ══ -->
      <nav class="bottom-tabs">
        <a class="tab-item" routerLink="/participantes" routerLinkActive="tab-active">
          <span class="tab-icon" nz-icon nzType="team"></span>
          <span>Participantes</span>
        </a>
        <a class="tab-item" routerLink="/inscricoes" routerLinkActive="tab-active">
          <span class="tab-icon" nz-icon nzType="profile"></span>
          <span>Inscrições</span>
        </a>
        <a class="tab-item" routerLink="/pagamentos" routerLinkActive="tab-active">
          <span class="tab-icon" nz-icon nzType="dollar"></span>
          <span>Pagamentos</span>
        </a>
        <a class="tab-item" routerLink="/relatorios" routerLinkActive="tab-active">
          <span class="tab-icon" nz-icon nzType="bar-chart"></span>
          <span>Relatórios</span>
        </a>
      </nav>

    </div>

    <!-- ══ LOGOUT CONFIRMATION ══ -->
    <ng-container *ngIf="logoutVisivel">
      <div class="logout-overlay"
           role="button" tabindex="-1" aria-label="Fechar"
           (click)="logoutVisivel = false"
           (keydown.escape)="logoutVisivel = false"></div>
      <div class="logout-card">
        <div class="lo-handle"></div>
        <div class="lo-user-row">
          <div class="lo-user-av">{{ iniciais }}</div>
          <div class="lo-user-info">
            <span class="lo-user-nome">{{ auth.usuario()?.nome }}</span>
            <span class="lo-user-email">{{ auth.usuario()?.email }}</span>
          </div>
        </div>
        <div class="lo-sep"></div>
        <div class="lo-icon"><span nz-icon nzType="logout" nzTheme="outline"></span></div>
        <div class="lo-title">Sair da conta</div>
        <div class="lo-desc">Tem certeza que deseja encerrar a sessão?<br>Você precisará fazer login novamente.</div>
        <div class="lo-btns">
          <button class="lo-confirm" (click)="auth.logout()">Sair</button>
          <button class="lo-cancel"  (click)="logoutVisivel = false">Cancelar</button>
        </div>
      </div>
    </ng-container>
  `,
})
export class LayoutComponent implements OnInit {
  auth = inject(AuthService);
  excursaoAtiva = inject(ExcursaoAtivaService);
  private router = inject(Router);
  private api = inject(ApiService);

  collapsed = false;
  isMobile = window.innerWidth <= 1024;
  mobileOpen = false;
  logoutVisivel = false;

  ngOnInit() {
    this.updateMobile();
    const exc = this.excursaoAtiva.excursao();
    if (exc) {
      this.api.get<Excursao>(`excursoes/${exc.id}`).subscribe({
        next: (e) => {
          if (e.status !== 'aberta') {
            this.excursaoAtiva.limpar();
            this.router.navigate(['/selecionar-excursao']);
          }
        },
        error: () => {
          this.excursaoAtiva.limpar();
          this.router.navigate(['/selecionar-excursao']);
        },
      });
    }
  }

  @HostListener('window:resize')
  updateMobile() {
    this.isMobile = window.innerWidth <= 1024;
    if (!this.isMobile) this.mobileOpen = false;
  }

  onNavClick() {
    if (this.isMobile) this.mobileOpen = false;
  }

  get iniciais(): string {
    const nome: string = this.auth.usuario()?.nome ?? '';
    return nome.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
  }

  confirmarLogout() { this.logoutVisivel = true; }

  trocarExcursao() {
    this.excursaoAtiva.limpar();
    this.router.navigate(['/selecionar-excursao']);
  }
}
