/**
 * RBAC do produto imobiliário. Catálogo único de permissões granulares e os
 * papéis embutidos (semeados por tenant). Ponto único de verdade: tanto a UI
 * de configuração de papéis quanto a autorização no servidor
 * (exigirPermissao em acoes.ts/consultas.ts) leem daqui. Funções puras — sem
 * I/O — pra serem testáveis sem banco.
 *
 * O catálogo já cobre os módulos das fases futuras (imóveis, leads,
 * financeiro, ...) de propósito: assim o admin consegue montar papéis
 * completos desde já e nenhuma fase futura precisa mexer no modelo de dados
 * de permissão, só passar a checar a chave correspondente.
 */

/** Grupos apenas para organizar a UI de configuração; não afetam a checagem. */
export const GRUPOS_PERMISSAO = [
  "Imóveis",
  "Proprietários",
  "Clientes",
  "Leads / CRM",
  "Corretores",
  "Captação",
  "Visitas",
  "Propostas",
  "Vendas",
  "Locações",
  "Contratos",
  "Financeiro",
  "Comissões",
  "Agenda",
  "Tarefas",
  "Documentos",
  "Relatórios",
  "Configurações",
  "Usuários e Papéis",
  "Auditoria",
] as const;
export type GrupoPermissao = (typeof GRUPOS_PERMISSAO)[number];

export interface DefinicaoPermissao {
  chave: string;
  grupo: GrupoPermissao;
  descricao: string;
}

// Helper interno para gerar as 4 permissões CRUD de um recurso sem repetir.
function crud(recurso: string, grupo: GrupoPermissao, rotulo: string): DefinicaoPermissao[] {
  return [
    { chave: `${recurso}.ver`, grupo, descricao: `Visualizar ${rotulo}` },
    { chave: `${recurso}.criar`, grupo, descricao: `Criar ${rotulo}` },
    { chave: `${recurso}.editar`, grupo, descricao: `Editar ${rotulo}` },
    { chave: `${recurso}.excluir`, grupo, descricao: `Inativar ${rotulo}` },
  ];
}

export const CATALOGO_PERMISSOES: readonly DefinicaoPermissao[] = [
  ...crud("imoveis", "Imóveis", "imóveis"),
  ...crud("proprietarios", "Proprietários", "proprietários"),
  ...crud("clientes", "Clientes", "clientes"),
  ...crud("leads", "Leads / CRM", "leads"),
  ...crud("corretores", "Corretores", "corretores"),
  ...crud("captacoes", "Captação", "captações"),
  ...crud("visitas", "Visitas", "visitas"),
  ...crud("propostas", "Propostas", "propostas"),
  ...crud("vendas", "Vendas", "vendas"),
  ...crud("locacoes", "Locações", "locações"),
  ...crud("contratos", "Contratos", "contratos"),
  ...crud("financeiro", "Financeiro", "lançamentos financeiros"),
  ...crud("comissoes", "Comissões", "comissões"),
  ...crud("agenda", "Agenda", "eventos de agenda"),
  ...crud("tarefas", "Tarefas", "tarefas"),
  ...crud("documentos", "Documentos", "documentos"),
  { chave: "relatorios.ver", grupo: "Relatórios", descricao: "Acessar relatórios" },
  { chave: "relatorios.exportar", grupo: "Relatórios", descricao: "Exportar relatórios (CSV/Excel/PDF)" },
  { chave: "configuracoes.ver", grupo: "Configurações", descricao: "Ver configurações da imobiliária" },
  { chave: "configuracoes.editar", grupo: "Configurações", descricao: "Editar configurações da imobiliária" },
  ...crud("usuarios", "Usuários e Papéis", "usuários"),
  ...crud("papeis", "Usuários e Papéis", "papéis"),
  { chave: "auditoria.ver", grupo: "Auditoria", descricao: "Consultar o log de auditoria" },
] as const;

/** Todas as chaves válidas do catálogo, como set para checagem O(1). */
export const PERMISSOES_VALIDAS: ReadonlySet<string> = new Set(CATALOGO_PERMISSOES.map((p) => p.chave));

/**
 * Curinga que concede tudo. Guardado num papel (Administrador) em vez de
 * listar cada chave — assim toda permissão nova do catálogo já vale para o
 * admin sem migração de dados.
 */
export const PERMISSAO_TOTAL = "*";

/** Papel embutido, com a lista de permissões que recebe ao ser semeado. */
export interface PapelPadrao {
  nome: string;
  descricao: string;
  permissoes: string[];
}

const TODAS_AS_CHAVES = CATALOGO_PERMISSOES.map((p) => p.chave);
const somenteVer = TODAS_AS_CHAVES.filter((c) => c.endsWith(".ver"));

export const PAPEIS_PADRAO: readonly PapelPadrao[] = [
  {
    nome: "Administrador",
    descricao: "Acesso total ao sistema e às configurações da imobiliária.",
    permissoes: [PERMISSAO_TOTAL],
  },
  {
    nome: "Gestor",
    descricao: "Gerencia operação comercial: imóveis, clientes, leads, propostas, vendas e relatórios.",
    permissoes: TODAS_AS_CHAVES.filter(
      (c) => !c.startsWith("usuarios.") && !c.startsWith("papeis.") && c !== "configuracoes.editar",
    ),
  },
  {
    nome: "Corretor",
    descricao: "Opera o dia a dia comercial dos próprios atendimentos.",
    permissoes: [
      "imoveis.ver",
      "imoveis.criar",
      "imoveis.editar",
      "proprietarios.ver",
      "proprietarios.criar",
      "clientes.ver",
      "clientes.criar",
      "clientes.editar",
      "leads.ver",
      "leads.criar",
      "leads.editar",
      "captacoes.ver",
      "captacoes.criar",
      "visitas.ver",
      "visitas.criar",
      "visitas.editar",
      "propostas.ver",
      "propostas.criar",
      "propostas.editar",
      "agenda.ver",
      "agenda.criar",
      "agenda.editar",
      "tarefas.ver",
      "tarefas.criar",
      "tarefas.editar",
      "documentos.ver",
      "documentos.criar",
    ],
  },
  {
    nome: "Financeiro",
    descricao: "Cuida de contas, comissões e relatórios financeiros.",
    permissoes: [
      "financeiro.ver",
      "financeiro.criar",
      "financeiro.editar",
      "comissoes.ver",
      "comissoes.criar",
      "comissoes.editar",
      "contratos.ver",
      "relatorios.ver",
      "relatorios.exportar",
      "imoveis.ver",
      "clientes.ver",
    ],
  },
  {
    nome: "Assistente",
    descricao: "Apoio operacional com acesso de leitura e agenda.",
    permissoes: [...somenteVer, "agenda.criar", "agenda.editar", "tarefas.criar", "tarefas.editar"],
  },
] as const;

/**
 * Núcleo da autorização: `permissoesDoPapel` contém uma permissão?
 * O curinga PERMISSAO_TOTAL concede qualquer chave.
 */
export function temPermissao(permissoesDoPapel: readonly string[], requerida: string): boolean {
  return permissoesDoPapel.includes(PERMISSAO_TOTAL) || permissoesDoPapel.includes(requerida);
}

export class PermissaoNegadaError extends Error {
  constructor(public readonly permissao: string) {
    super(`acesso negado: falta a permissão ${permissao}`);
    this.name = "PermissaoNegadaError";
  }
}

/**
 * Lança PermissaoNegadaError se o papel não tiver a permissão. Usada no início
 * de toda server action / consulta que exige autorização — a checagem mora no
 * servidor, nunca só na UI.
 */
export function exigirPermissao(permissoesDoPapel: readonly string[], requerida: string): void {
  if (!temPermissao(permissoesDoPapel, requerida)) {
    throw new PermissaoNegadaError(requerida);
  }
}

/**
 * Filtra uma lista de permissões pedidas, mantendo só as que existem no
 * catálogo (mais o curinga). Usada ao criar/editar papel customizado pra
 * nunca gravar chave inventada no banco.
 */
export function sanitizarPermissoes(permissoes: readonly string[]): string[] {
  const limpas = permissoes.filter((p) => p === PERMISSAO_TOTAL || PERMISSOES_VALIDAS.has(p));
  // dedup preservando ordem
  return Array.from(new Set(limpas));
}
