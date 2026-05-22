import { Parcela } from '@prisma/client';

export function isQuitado(parcelas: Parcela[]): boolean {
  return parcelas.length > 0 && parcelas.every((p) => p.status === 'paga');
}
