import { z } from 'zod';

export const CriarExcursaoSchema = z.object({
  nome: z.string().min(1),
  destino: z.string().min(1),
  dataIda: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataVolta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  valor: z.number().positive(),
  numParcelas: z.number().int().positive(),
  tipoVeiculo: z.enum(['onibus', 'van']),
  totalAssentos: z.number().int().positive(),
});

export const AtualizarExcursaoSchema = CriarExcursaoSchema.partial().omit({
  valor: true,
  numParcelas: true,
});

export type CriarExcursaoDto = z.infer<typeof CriarExcursaoSchema>;
export type AtualizarExcursaoDto = z.infer<typeof AtualizarExcursaoSchema>;
