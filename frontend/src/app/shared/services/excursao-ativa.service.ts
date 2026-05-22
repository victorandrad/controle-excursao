import { Injectable, signal } from '@angular/core';
import { Excursao } from '../models';

@Injectable({ providedIn: 'root' })
export class ExcursaoAtivaService {
  excursao = signal<Excursao | null>(this.carregarLocal());

  selecionar(e: Excursao) {
    this.excursao.set(e);
    localStorage.setItem('excursao_ativa', JSON.stringify(e));
  }

  limpar() {
    this.excursao.set(null);
    localStorage.removeItem('excursao_ativa');
  }

  private carregarLocal(): Excursao | null {
    try {
      const raw = localStorage.getItem('excursao_ativa');
      return raw ? (JSON.parse(raw) as Excursao) : null;
    } catch {
      return null;
    }
  }
}
