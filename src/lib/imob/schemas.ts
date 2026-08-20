import { z } from "zod";
import { reaisParaCentavos } from "@/lib/imob/formato";

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

// ===========================================================================
// FASE 2 — Proprietários, Clientes, Imóveis
// ===========================================================================

export const TIPOS_IMOVEL = [
  "CASA",
  "APARTAMENTO",
  "TERRENO",
  "SALA_COMERCIAL",
  "LOJA",
  "GALPAO",
  "FAZENDA",
  "CHACARA",
  "SITIO",
  "PREDIO",
  "OUTROS",
] as const;
export const FINALIDADES_IMOVEL = ["VENDA", "LOCACAO", "VENDA_LOCACAO"] as const;
export const STATUS_IMOVEL = ["DISPONIVEL", "RESERVADO", "EM_NEGOCIACAO", "VENDIDO", "ALUGADO", "INATIVO"] as const;
export const TIPOS_PESSOA = ["FISICA", "JURIDICA"] as const;
export const TIPOS_CLIENTE = ["COMPRADOR", "LOCATARIO", "INVESTIDOR", "PROPRIETARIO", "INTERESSADO"] as const;

const textoOpcional = z.string().trim().optional();
// campo de dinheiro que chega como string "1.234,56" e vira centavos (Int|null)
const dinheiroOpcional = z.preprocess(
  (v) => (typeof v === "string" || typeof v === "number" ? reaisParaCentavos(v) : null),
  z.number().int().nonnegative().nullable(),
);
const inteiroOpcional = z.coerce.number().int().nonnegative().optional();
const decimalOpcional = z.coerce.number().nonnegative().optional();

// --- Proprietário ---------------------------------------------------------

export const proprietarioSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome"),
  tipoPessoa: z.enum(TIPOS_PESSOA).default("FISICA"),
  documento: textoOpcional,
  email: z.union([z.string().trim().toLowerCase().email("e-mail inválido"), z.literal("")]).optional(),
  telefone: textoOpcional,
  whatsapp: textoOpcional,
  endereco: textoOpcional,
  observacoes: textoOpcional,
});
export type ProprietarioInput = z.infer<typeof proprietarioSchema>;

// --- Cliente --------------------------------------------------------------

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome"),
  tipo: z.enum(TIPOS_CLIENTE).default("INTERESSADO"),
  tipoPessoa: z.enum(TIPOS_PESSOA).default("FISICA"),
  documento: textoOpcional,
  email: z.union([z.string().trim().toLowerCase().email("e-mail inválido"), z.literal("")]).optional(),
  telefone: textoOpcional,
  whatsapp: textoOpcional,
  dataNascimento: z.union([z.coerce.date(), z.literal("")]).optional(),
  profissao: textoOpcional,
  estadoCivil: textoOpcional,
  endereco: textoOpcional,
  observacoes: textoOpcional,
  // preferências
  prefTipoImovel: z.union([z.enum(TIPOS_IMOVEL), z.literal("")]).optional(),
  prefFinalidade: z.union([z.enum(FINALIDADES_IMOVEL), z.literal("")]).optional(),
  prefValorMin: dinheiroOpcional,
  prefValorMax: dinheiroOpcional,
  prefCidade: textoOpcional,
  prefBairro: textoOpcional,
  prefQuartos: inteiroOpcional,
  prefSuites: inteiroOpcional,
  prefVagas: inteiroOpcional,
  prefAreaMinima: decimalOpcional,
});
export type ClienteInput = z.infer<typeof clienteSchema>;

// --- Imóvel ---------------------------------------------------------------

export const imovelSchema = z.object({
  codigo: z.string().trim().min(1, "informe o código interno"),
  titulo: z.string().trim().min(1, "informe o título"),
  descricao: textoOpcional,
  tipo: z.enum(TIPOS_IMOVEL),
  finalidade: z.enum(FINALIDADES_IMOVEL),
  status: z.enum(STATUS_IMOVEL).default("DISPONIVEL"),
  precoVenda: dinheiroOpcional,
  precoAluguel: dinheiroOpcional,
  condominio: dinheiroOpcional,
  iptu: dinheiroOpcional,
  areaTotal: decimalOpcional,
  areaConstruida: decimalOpcional,
  quartos: inteiroOpcional,
  suites: inteiroOpcional,
  banheiros: inteiroOpcional,
  vagas: inteiroOpcional,
  andar: z.coerce.number().int().optional(),
  anoConstrucao: z.coerce.number().int().optional(),
  aceitaFinanciamento: z.coerce.boolean().optional(),
  aceitaPermuta: z.coerce.boolean().optional(),
  mobiliado: z.coerce.boolean().optional(),
  caracteristicas: z.array(z.string().trim().min(1)).default([]),
  cep: textoOpcional,
  logradouro: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  estado: z.union([z.string().trim().length(2, "UF deve ter 2 letras"), z.literal("")]).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  tourVirtualUrl: textoOpcional,
  proprietarioIds: z.array(z.string().min(1)).default([]),
});
export type ImovelInput = z.infer<typeof imovelSchema>;

export const fotoImovelSchema = z.object({
  imovelId: z.string().min(1),
  url: z.string().trim().min(1, "informe a URL da imagem"),
  legenda: textoOpcional,
});
export type FotoImovelInput = z.infer<typeof fotoImovelSchema>;

// parâmetros de listagem (paginação/busca/filtro), validados antes de consultar
export const listagemImoveisSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  busca: z.string().trim().optional(),
  status: z.union([z.enum(STATUS_IMOVEL), z.literal("")]).optional(),
  tipo: z.union([z.enum(TIPOS_IMOVEL), z.literal("")]).optional(),
  finalidade: z.union([z.enum(FINALIDADES_IMOVEL), z.literal("")]).optional(),
});
export type ListagemImoveisInput = z.infer<typeof listagemImoveisSchema>;
