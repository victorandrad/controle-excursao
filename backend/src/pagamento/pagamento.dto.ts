import { z } from 'zod';

export const RegistrarPagamentoSchema = z
  .object({
    parcelaId: z.string().uuid(),
    valorPago: z.number().positive(),
    dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    metodo: z.enum(['dinheiro', 'pix']),
    referencia: z.string().optional(),
  })
  .refine(
    (d) => d.metodo !== 'pix' || (d.referencia && d.referencia.length > 0),
    {
      message: 'Referência obrigatória para pagamento Pix',
      path: ['referencia'],
    },
  );

export type RegistrarPagamentoDto = z.infer<typeof RegistrarPagamentoSchema>;
