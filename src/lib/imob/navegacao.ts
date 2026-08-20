import { temPermissao } from "@/lib/imob/rbac";

/**
 * Itens de navegação do painel imobiliário. `permissao: null` = sempre
 * visível. Cada item que exige permissão só aparece pra quem a tem (o filtro
 * é feito no servidor, em filtrarNavegacao). Nesta Fase 1 só existem as
 * telas de gestão da conta; os módulos de negócio (imóveis, leads, ...)
 * entram como itens novos conforme cada fase.
 */
export interface ItemNav {
  href: string;
  rotulo: string;
  permissao: string | null;
}

export const ITENS_NAV: readonly ItemNav[] = [
  { href: "/imob", rotulo: "Painel", permissao: null },
  { href: "/imob/leads", rotulo: "Leads (CRM)", permissao: "leads.ver" },
  { href: "/imob/imoveis", rotulo: "Imóveis", permissao: "imoveis.ver" },
  { href: "/imob/matching", rotulo: "Compatibilidade", permissao: "clientes.ver" },
  { href: "/imob/proprietarios", rotulo: "Proprietários", permissao: "proprietarios.ver" },
  { href: "/imob/clientes", rotulo: "Clientes", permissao: "clientes.ver" },
  { href: "/imob/corretores", rotulo: "Corretores", permissao: "corretores.ver" },
  { href: "/imob/captacoes", rotulo: "Captação", permissao: "captacoes.ver" },
  { href: "/imob/visitas", rotulo: "Visitas", permissao: "visitas.ver" },
  { href: "/imob/propostas", rotulo: "Propostas", permissao: "propostas.ver" },
  { href: "/imob/vendas", rotulo: "Vendas", permissao: "vendas.ver" },
  { href: "/imob/locacoes", rotulo: "Locações", permissao: "locacoes.ver" },
  { href: "/imob/contratos", rotulo: "Contratos", permissao: "contratos.ver" },
  { href: "/imob/financeiro", rotulo: "Financeiro", permissao: "financeiro.ver" },
  { href: "/imob/fluxo-caixa", rotulo: "Fluxo de caixa", permissao: "financeiro.ver" },
  { href: "/imob/comissoes", rotulo: "Comissões", permissao: "comissoes.ver" },
  { href: "/imob/agenda", rotulo: "Agenda", permissao: "agenda.ver" },
  { href: "/imob/tarefas", rotulo: "Tarefas", permissao: "tarefas.ver" },
  { href: "/imob/usuarios", rotulo: "Usuários", permissao: "usuarios.ver" },
  { href: "/imob/papeis", rotulo: "Papéis e permissões", permissao: "papeis.ver" },
  { href: "/imob/configuracoes", rotulo: "Configurações", permissao: "configuracoes.ver" },
  { href: "/imob/auditoria", rotulo: "Auditoria", permissao: "auditoria.ver" },
] as const;

export function filtrarNavegacao(permissoesDoPapel: readonly string[]): ItemNav[] {
  return ITENS_NAV.filter((item) => item.permissao === null || temPermissao(permissoesDoPapel, item.permissao));
}
