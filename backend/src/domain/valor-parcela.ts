import { Decimal } from '@prisma/client/runtime/library';

export function calcularValorParcela(
  valor: Decimal,
  numParcelas: number,
): Decimal {
  return valor.div(numParcelas);
}

export function isDivisaoExata(valor: Decimal, numParcelas: number): boolean {
  return valor.mod(numParcelas).equals(0);
}
