import { z } from 'zod';

export const InscreverSchema = z.object({
  excursaoId: z.string().uuid(),
  participanteId: z.string().uuid(),
});

export type InscreverDto = z.infer<typeof InscreverSchema>;

export const AtribuirAssentoSchema = z.object({
  numeroAssento: z.number().int().positive().nullable(),
});

export type AtribuirAssentoDto = z.infer<typeof AtribuirAssentoSchema>;

export const TrocarAssentosSchema = z.object({
  inscricaoAId: z.string().uuid(),
  inscricaoBId: z.string().uuid(),
});

export type TrocarAssentosDto = z.infer<typeof TrocarAssentosSchema>;
