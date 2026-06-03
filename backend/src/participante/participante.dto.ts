import { z } from 'zod';

export const CriarParticipanteSchema = z.object({
  nome: z.string().min(1),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{11}$/))
    .optional(),
  rg: z.string().optional(),
  telefone: z.string().optional(),
});

export const AtualizarParticipanteSchema =
  CriarParticipanteSchema.partial().extend({
    // No update, cpf aceita null para permitir limpar.
    cpf: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .pipe(z.string().regex(/^\d{11}$/))
      .nullable()
      .optional(),
  });

export type CriarParticipanteDto = z.infer<typeof CriarParticipanteSchema>;
export type AtualizarParticipanteDto = z.infer<
  typeof AtualizarParticipanteSchema
>;
