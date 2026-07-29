import { z } from "zod";

export const metasSchema = z.object({
  metaKcal: z.coerce.number().int().positive("kcal deve ser positivo"),
  metaProteina: z.coerce.number().int().nonnegative("proteína não pode ser negativa"),
  metaCarbo: z.coerce.number().int().nonnegative("carboidrato não pode ser negativo"),
  metaGordura: z.coerce.number().int().nonnegative("gordura não pode ser negativa"),
});

export const criarPacienteSchema = z
  .object({
    nome: z.string().trim().min(1, "informe o nome"),
    telefone: z.string().trim().optional(),
  })
  .merge(metasSchema);

export type CriarPacienteInput = z.infer<typeof criarPacienteSchema>;

export const atualizarMetasSchema = z
  .object({
    pacienteId: z.string().min(1),
  })
  .merge(metasSchema);

export type AtualizarMetasInput = z.infer<typeof atualizarMetasSchema>;

export const pacienteIdSchema = z.object({
  pacienteId: z.string().min(1),
});
