import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzButtonModule, NzIconModule],
  styles: [`
    .page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1890ff 0%, #096dd9 50%, #003a8c 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .box {
      width: 100%;
      max-width: 380px;
    }
    .brand {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand-icon {
      width: 64px; height: 64px;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: #fff;
      margin-bottom: 14px;
    }
    .brand h1 {
      color: #fff;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 4px;
      letter-spacing: -0.3px;
    }
    .brand p {
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      margin: 0;
    }
    .card {
      background: #fff;
      border-radius: 14px;
      padding: 32px 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .card h2 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 24px;
    }
    .footer-txt {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
    }
  `],
  template: `
    <div class="page">
      <div class="box">

        <div class="brand">
          <div class="brand-icon">
            <span nz-icon nzType="trophy" nzTheme="outline"></span>
          </div>
          <h1>Controle de Excursões</h1>
          <p>Sistema de gestão de excursões</p>
        </div>

        <div class="card">
          <h2>Entrar na sua conta</h2>
          <form nz-form nzLayout="vertical" (ngSubmit)="entrar()">
            <nz-form-item>
              <nz-form-label>E-mail</nz-form-label>
              <nz-form-control>
                <nz-input-group nzPrefixIcon="user" nzSize="large">
                  <input nz-input nzSize="large" [(ngModel)]="email" name="email"
                         placeholder="seu@email.com" type="email" autocomplete="email" required />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>Senha</nz-form-label>
              <nz-form-control>
                <nz-input-group nzPrefixIcon="lock" nzSize="large">
                  <input nz-input nzSize="large" [(ngModel)]="senha" name="senha"
                         placeholder="••••••••" type="password" autocomplete="current-password" required />
                </nz-input-group>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" nzBlock nzSize="large"
                    [nzLoading]="carregando" type="submit"
                    style="margin-top:4px; height:44px; font-size:15px; font-weight:600; border-radius:8px">
              Entrar
            </button>
          </form>
        </div>

        <p class="footer-txt">Acesso restrito a membros autorizados</p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  senha = '';
  carregando = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private message: NzMessageService,
  ) {}

  entrar() {
    if (!this.email || !this.senha) return;
    this.carregando = true;
    this.auth.login(this.email, this.senha).subscribe({
      next: () => this.router.navigate(['/selecionar-excursao']),
      error: () => {
        this.message.error('E-mail ou senha inválidos');
        this.carregando = false;
      },
    });
  }
}
