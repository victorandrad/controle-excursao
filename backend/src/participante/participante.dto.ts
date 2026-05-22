import { z } from 'zod';

export const CriarParticipanteSchema = z.object({
  nome: z.string().min(1),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{11}$/))
    .optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
});

export const AtualizarParticipanteSchema = CriarParticipanteSchema.omit({
  cpf: true,
}).partial();

export type CriarParticipanteDto = z.infer<typeof CriarParticipanteSchema>;
export type AtualizarParticipanteDto = z.infer<
  typeof AtualizarParticipanteSchema
>;
