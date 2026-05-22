import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { excursaoGuard } from './shared/guards/excursao.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'selecionar-excursao',
    canActivate: [authGuard],
    loadComponent: () => import('./excursoes/selecionar-excursao.component').then(m => m.SelecionarExcursaoComponent),
  },
  {
    path: 'excursoes',
    canActivate: [authGuard],
    loadComponent: () => import('./excursoes/excursoes-list.component').then(m => m.ExcursoesListComponent),
  },
  {
    path: '',
    canActivate: [authGuard, excursaoGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: 'participantes', loadComponent: () => import('./participantes/participantes-list.component').then(m => m.ParticipantesListComponent) },
      { path: 'inscricoes',    loadComponent: () => import('./inscricoes/inscricoes.component').then(m => m.InscricoesComponent) },
      { path: 'pagamentos',    loadComponent: () => import('./pagamentos/pagamentos.component').then(m => m.PagamentosComponent) },
      { path: 'relatorios',    loadComponent: () => import('./relatorios/relatorios.component').then(m => m.RelatoriosComponent) },
      { path: '', redirectTo: 'participantes', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
