import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ExcursaoAtivaService } from '../services/excursao-ativa.service';

export const excursaoGuard: CanActivateFn = () => {
  const excursao = inject(ExcursaoAtivaService);
  if (excursao.excursao()) return true;
  return inject(Router).createUrlTree(['/selecionar-excursao']);
};
