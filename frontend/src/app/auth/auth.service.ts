import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ExcursaoAtivaService } from '../shared/services/excursao-ativa.service';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'tesoureiro';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessKey  = 'access_token';
  private readonly refreshKey = 'refresh_token';

  usuario = signal<Usuario | null>(this.usuarioSalvo());

  private excursaoAtiva = inject(ExcursaoAtivaService);

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, senha: string) {
    return this.http
      .post<{ access_token: string; refresh_token: string; usuario: Usuario }>(
        `${environment.apiUrl}/auth/login`,
        { email, senha },
      )
      .pipe(
        tap(({ access_token, refresh_token, usuario }) => {
          localStorage.setItem(this.accessKey,  access_token);
          localStorage.setItem(this.refreshKey, refresh_token);
          localStorage.setItem('usuario', JSON.stringify(usuario));
          this.usuario.set(usuario);
        }),
      );
  }

  refresh() {
    const refreshToken = localStorage.getItem(this.refreshKey);
    return this.http
      .post<{ access_token: string }>(
        `${environment.apiUrl}/auth/refresh`,
        { refresh_token: refreshToken },
      )
      .pipe(
        tap(({ access_token }) => {
          localStorage.setItem(this.accessKey, access_token);
        }),
      );
  }

  logout() {
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem('usuario');
    this.usuario.set(null);
    this.excursaoAtiva.limpar();
    this.router.navigate(['/login']);
  }

  token(): string | null {
    return localStorage.getItem(this.accessKey);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  private usuarioSalvo(): Usuario | null {
    try {
      const raw = localStorage.getItem('usuario');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
