import { z } from "zod";

/**
 * Schemas Zod do produto imobiliário. Regra do projeto: toda entrada de
 * server action / rota passa por parse aqui antes de tocar o banco — nunca
 * confiar em FormData/JSON cru.
 */

export const StatusUsuarioImob = {
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
} as const;
export type StatusUsuarioImob = (typeof StatusUsuarioImob)[keyof typeof StatusUsuarioImob];

const emailSchema = z.string().trim().toLowerCase().email("e-mail inválido");
const senhaSchema = z.string().min(6, "a senha deve ter pelo menos 6 caracteres");

// --- Usuários -------------------------------------------------------------

export const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome"),
  email: emailSchema,
  senha: senhaSchema,
  telefone: z.string().trim().optional(),
  papelId: z.string().min(1, "selecione um papel"),
});
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const editarUsuarioSchema = z.object({
  usuarioId: z.string().min(1),
  nome: z.string().trim().min(1, "informe o nome"),
  telefone: z.string().trim().optional(),
  papelId: z.string().min(1, "selecione um papel"),
  status: z.nativeEnum(StatusUsuarioImob),
});
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;

// --- Papéis ---------------------------------------------------------------

export const criarPapelSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome do papel"),
  descricao: z.string().trim().optional(),
  // as chaves são validadas contra o catálogo em sanitizarPermissoes (rbac.ts)
  permissoes: z.array(z.string()).default([]),
});
export type CriarPapelInput = z.infer<typeof criarPapelSchema>;

export const editarPapelSchema = criarPapelSchema.extend({
  papelId: z.string().min(1),
});
export type EditarPapelInput = z.infer<typeof editarPapelSchema>;

// --- Onboarding / Configurações da imobiliária ----------------------------

export const dadosImobiliariaSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome da imobiliária"),
  cnpj: z.string().trim().optional(),
  creci: z.string().trim().optional(),
  email: z.union([emailSchema, z.literal("")]).optional(),
  telefone: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  logradouro: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  estado: z.string().trim().length(2, "UF deve ter 2 letras").optional().or(z.literal("")),
  corPrimaria: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, "use um hex tipo #2563EB")
    .optional(),
});
export type DadosImobiliariaInput = z.infer<typeof dadosImobiliariaSchema>;

// Cadastro público de uma nova imobiliária (self-service): cria o tenant + o
// primeiro usuário Administrador de uma vez.
export const cadastroImobiliariaSchema = z.object({
  nomeImobiliaria: z.string().trim().min(1, "informe o nome da imobiliária"),
  nomeAdmin: z.string().trim().min(1, "informe seu nome"),
  email: emailSchema,
  senha: senhaSchema,
});
export type CadastroImobiliariaInput = z.infer<typeof cadastroImobiliariaSchema>;
