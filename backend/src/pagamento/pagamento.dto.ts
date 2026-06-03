import { z } from 'zod';

// Campos chegam como multipart/form-data (strings) — daí o coerce em valorPago.
// A obrigatoriedade do comprovante no Pix é validada no service (o arquivo não
// faz parte deste schema). A referência passa a ser opcional.
export const RegistrarPagamentoSchema = z.object({
  parcelaId: z.string().uuid(),
  valorPago: z.coerce.number().positive(),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metodo: z.enum(['dinheiro', 'pix']),
  referencia: z.string().optional(),
});

export type RegistrarPagamentoDto = z.infer<typeof RegistrarPagamentoSchema>;

// Edição de um pagamento existente. Não permite trocar a parcela (campo ausente).
// Comprovante segue por multipart (opcional — mantém o anterior se não vier novo).
export const AtualizarPagamentoSchema = z.object({
  valorPago: z.coerce.number().positive(),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metodo: z.enum(['dinheiro', 'pix']),
  referencia: z.string().optional(),
});

export type AtualizarPagamentoDto = z.infer<typeof AtualizarPagamentoSchema>;
