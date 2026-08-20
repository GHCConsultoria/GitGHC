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

// ===========================================================================
// FASE 3 — Corretores, Leads, Visitas, Tarefas, Captação
// ===========================================================================

export const ORIGENS_LEAD = [
  "SITE",
  "INSTAGRAM",
  "FACEBOOK",
  "WHATSAPP",
  "PORTAL",
  "INDICACAO",
  "GOOGLE",
  "TELEFONE",
  "PRESENCIAL",
  "OUTROS",
] as const;
export const ETAPAS_LEAD = [
  "NOVO",
  "CONTATO_REALIZADO",
  "QUALIFICACAO",
  "VISITA_AGENDADA",
  "VISITA_REALIZADA",
  "PROPOSTA",
  "NEGOCIACAO",
  "FECHADO",
  "PERDIDO",
] as const;
export const STATUS_VISITA = ["AGENDADA", "CONFIRMADA", "REALIZADA", "CANCELADA", "NAO_COMPARECEU"] as const;
export const PRIORIDADES_TAREFA = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
export const STATUS_TAREFA = ["PENDENTE", "CONCLUIDA"] as const;
export const STATUS_CAPTACAO = [
  "PROSPECTADO",
  "CONTATO_REALIZADO",
  "VISITA_CAPTACAO",
  "DOCUMENTACAO",
  "CONTRATO",
  "ATIVO",
  "ENCERRADO",
] as const;
export const INTERESSES_VISITA = ["ALTO", "MEDIO", "BAIXO"] as const;

const idOpcional = z.union([z.string().min(1), z.literal("")]).optional();
const dataOpcional = z.union([z.coerce.date(), z.literal("")]).optional();
const percentualOpcional = z.coerce.number().min(0).max(100).optional();

export const corretorSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome"),
  cpf: textoOpcional,
  creci: textoOpcional,
  email: z.union([z.string().trim().toLowerCase().email("e-mail inválido"), z.literal("")]).optional(),
  telefone: textoOpcional,
  whatsapp: textoOpcional,
  dataEntrada: dataOpcional,
  metaMensal: dinheiroOpcional,
  percentualComissao: percentualOpcional,
});
export type CorretorInput = z.infer<typeof corretorSchema>;

export const leadSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome"),
  telefone: textoOpcional,
  whatsapp: textoOpcional,
  email: z.union([z.string().trim().toLowerCase().email("e-mail inválido"), z.literal("")]).optional(),
  origem: z.enum(ORIGENS_LEAD).default("OUTROS"),
  etapa: z.enum(ETAPAS_LEAD).default("NOVO"),
  valorPretendido: dinheiroOpcional,
  observacoes: textoOpcional,
  proximaAcao: dataOpcional,
  corretorId: idOpcional,
  imovelId: idOpcional,
  clienteId: idOpcional,
});
export type LeadInput = z.infer<typeof leadSchema>;

export const moverLeadSchema = z.object({
  leadId: z.string().min(1),
  etapa: z.enum(ETAPAS_LEAD),
});

export const interacaoLeadSchema = z.object({
  leadId: z.string().min(1),
  tipo: z.string().trim().min(1, "informe o tipo"),
  descricao: z.string().trim().min(1, "descreva a interação"),
});

export const visitaSchema = z.object({
  imovelId: z.string().min(1, "selecione o imóvel"),
  clienteId: idOpcional,
  leadId: idOpcional,
  corretorId: idOpcional,
  data: z.coerce.date({ message: "informe data e hora" }),
  duracaoMin: z.coerce.number().int().positive().default(30),
  status: z.enum(STATUS_VISITA).default("AGENDADA"),
  observacoes: textoOpcional,
});
export type VisitaInput = z.infer<typeof visitaSchema>;

export const resultadoVisitaSchema = z.object({
  visitaId: z.string().min(1),
  status: z.enum(STATUS_VISITA),
  interesse: z.union([z.enum(INTERESSES_VISITA), z.literal("")]).optional(),
  nota: z.union([z.coerce.number().int().min(0).max(10), z.literal("")]).optional(),
  feedback: textoOpcional,
  proximoPasso: textoOpcional,
});

export const tarefaSchema = z.object({
  titulo: z.string().trim().min(1, "informe o título"),
  descricao: textoOpcional,
  prioridade: z.enum(PRIORIDADES_TAREFA).default("MEDIA"),
  prazo: dataOpcional,
  responsavelId: idOpcional,
  clienteId: idOpcional,
  imovelId: idOpcional,
  leadId: idOpcional,
});
export type TarefaInput = z.infer<typeof tarefaSchema>;

export const captacaoSchema = z.object({
  proprietarioId: idOpcional,
  imovelId: idOpcional,
  corretorId: idOpcional,
  dataCaptacao: dataOpcional,
  origem: textoOpcional,
  exclusividade: z.coerce.boolean().optional(),
  comissaoPercentual: percentualOpcional,
  validadeExclusividade: dataOpcional,
  status: z.enum(STATUS_CAPTACAO).default("PROSPECTADO"),
  observacoes: textoOpcional,
});
export type CaptacaoInput = z.infer<typeof captacaoSchema>;

// ===========================================================================
// FASE 4 — Propostas, Vendas, Locações, Contratos
// ===========================================================================

export const STATUS_PROPOSTA = [
  "RASCUNHO",
  "ENVIADA",
  "EM_ANALISE",
  "ACEITA",
  "RECUSADA",
  "EXPIRADA",
  "CANCELADA",
] as const;
export const STATUS_LOCACAO = ["ATIVO", "ENCERRADO", "RESCINDIDO", "INADIMPLENTE"] as const;
export const TIPOS_CONTRATO = ["ADMINISTRACAO", "LOCACAO", "COMPRA_VENDA", "CAPTACAO", "PRESTACAO_SERVICOS"] as const;
export const STATUS_CONTRATO = ["ATIVO", "ENCERRADO", "CANCELADO"] as const;

const dinheiroObrigatorio = z.preprocess(
  (v) => (typeof v === "string" || typeof v === "number" ? reaisParaCentavos(v) : null),
  z.number({ message: "informe um valor" }).int().nonnegative(),
);

export const propostaSchema = z.object({
  imovelId: z.string().min(1, "selecione o imóvel"),
  clienteId: idOpcional,
  corretorId: idOpcional,
  valorProposto: dinheiroObrigatorio,
  valorSolicitado: dinheiroOpcional,
  formaPagamento: textoOpcional,
  entrada: dinheiroOpcional,
  financiamento: z.coerce.boolean().optional(),
  permuta: z.coerce.boolean().optional(),
  validade: dataOpcional,
  observacoes: textoOpcional,
});
export type PropostaInput = z.infer<typeof propostaSchema>;

export const mudarStatusPropostaSchema = z.object({
  propostaId: z.string().min(1),
  status: z.enum(STATUS_PROPOSTA),
  observacao: textoOpcional,
});

export const vendaSchema = z.object({
  imovelId: z.string().min(1, "selecione o imóvel"),
  clienteId: idOpcional,
  proprietarioId: idOpcional,
  corretorId: idOpcional,
  propostaId: idOpcional,
  valorVenda: dinheiroObrigatorio,
  data: dataOpcional,
  formaPagamento: textoOpcional,
  financiamento: z.coerce.boolean().optional(),
  comissaoValor: dinheiroOpcional,
  observacoes: textoOpcional,
});
export type VendaInput = z.infer<typeof vendaSchema>;

export const locacaoSchema = z.object({
  imovelId: z.string().min(1, "selecione o imóvel"),
  proprietarioId: idOpcional,
  locatarioId: idOpcional,
  corretorId: idOpcional,
  fiadorNome: textoOpcional,
  valorAluguel: dinheiroObrigatorio,
  condominio: dinheiroOpcional,
  iptu: dinheiroOpcional,
  seguro: dinheiroOpcional,
  caucao: dinheiroOpcional,
  dataInicial: z.coerce.date({ message: "informe a data inicial" }),
  dataFinal: dataOpcional,
  diaVencimento: z.union([z.coerce.number().int().min(1).max(31), z.literal("")]).optional(),
  indiceReajuste: textoOpcional,
  status: z.enum(STATUS_LOCACAO).default("ATIVO"),
});
export type LocacaoInput = z.infer<typeof locacaoSchema>;

export const contratoSchema = z.object({
  titulo: z.string().trim().min(1, "informe o título"),
  tipo: z.enum(TIPOS_CONTRATO),
  imovelId: idOpcional,
  clienteId: idOpcional,
  proprietarioId: idOpcional,
  dataInicio: dataOpcional,
  dataFim: dataOpcional,
  status: z.enum(STATUS_CONTRATO).default("ATIVO"),
  observacoes: textoOpcional,
});
export type ContratoInput = z.infer<typeof contratoSchema>;

export const documentoContratoSchema = z.object({
  contratoId: z.string().min(1),
  nome: z.string().trim().min(1, "informe o nome do documento"),
  url: z.string().trim().min(1, "informe a URL do documento"),
});

// ===========================================================================
// FASE 5 — Financeiro e Comissões
// ===========================================================================

export const TIPOS_LANCAMENTO = ["RECEBER", "PAGAR"] as const;
export const STATUS_LANCAMENTO = ["PENDENTE", "PAGO", "CANCELADO"] as const;
export const TIPOS_COMISSAO = ["CORRETOR_VENDEDOR", "CORRETOR_CAPTADOR", "GERENTE", "IMOBILIARIA"] as const;
export const STATUS_COMISSAO = ["PREVISTA", "APROVADA", "PAGA", "CANCELADA"] as const;

export const lancamentoSchema = z.object({
  tipo: z.enum(TIPOS_LANCAMENTO),
  descricao: z.string().trim().min(1, "informe a descrição"),
  categoria: textoOpcional,
  valor: dinheiroObrigatorio,
  vencimento: z.coerce.date({ message: "informe o vencimento" }),
  formaPagamento: textoOpcional,
  centroCusto: textoOpcional,
  clienteId: idOpcional,
  imovelId: idOpcional,
  contratoId: idOpcional,
  corretorId: idOpcional,
});
export type LancamentoInput = z.infer<typeof lancamentoSchema>;

export const marcarPagoSchema = z.object({
  lancamentoId: z.string().min(1),
  pagamentoEm: dataOpcional,
});

export const comissaoSchema = z.object({
  corretorId: idOpcional,
  vendaId: idOpcional,
  tipo: z.enum(TIPOS_COMISSAO).default("CORRETOR_VENDEDOR"),
  descricao: textoOpcional,
  percentual: z.union([z.coerce.number().min(0).max(100), z.literal("")]).optional(),
  valorPrevisto: dinheiroObrigatorio,
});
export type ComissaoInput = z.infer<typeof comissaoSchema>;

export const mudarStatusComissaoSchema = z.object({
  comissaoId: z.string().min(1),
  status: z.enum(STATUS_COMISSAO),
});

// Gera as comissões de uma venda aplicando percentuais de distribuição.
export const gerarComissoesSchema = z.object({
  vendaId: z.string().min(1, "selecione a venda"),
  percentualTotal: z.coerce.number().min(0).max(100),
  pctCorretorVendedor: z.coerce.number().min(0).max(100).default(50),
  pctCorretorCaptador: z.coerce.number().min(0).max(100).default(0),
  pctGerente: z.coerce.number().min(0).max(100).default(0),
  pctImobiliaria: z.coerce.number().min(0).max(100).default(50),
});

// ===========================================================================
// FASE 6 — Documentos, Notificações
// ===========================================================================

export const TIPOS_DOCUMENTO = [
  "RG",
  "CPF",
  "COMPROVANTE_ENDERECO",
  "MATRICULA",
  "CONTRATO",
  "CERTIDAO",
  "COMPROVANTE_RENDA",
  "OUTROS",
] as const;

export const documentoSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome do documento"),
  tipo: z.enum(TIPOS_DOCUMENTO).default("OUTROS"),
  url: z.string().trim().min(1, "informe a URL do documento"),
  validade: dataOpcional,
  clienteId: idOpcional,
  proprietarioId: idOpcional,
  imovelId: idOpcional,
  contratoId: idOpcional,
});
export type DocumentoInput = z.infer<typeof documentoSchema>;

export const buscaGlobalSchema = z.object({
  q: z.string().trim().min(2, "digite ao menos 2 caracteres").max(80),
});
