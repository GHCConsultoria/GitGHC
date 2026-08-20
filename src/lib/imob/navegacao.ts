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
  { href: "/imob/usuarios", rotulo: "Usuários", permissao: "usuarios.ver" },
  { href: "/imob/papeis", rotulo: "Papéis e permissões", permissao: "papeis.ver" },
  { href: "/imob/configuracoes", rotulo: "Configurações", permissao: "configuracoes.ver" },
  { href: "/imob/auditoria", rotulo: "Auditoria", permissao: "auditoria.ver" },
] as const;

export function filtrarNavegacao(permissoesDoPapel: readonly string[]): ItemNav[] {
  return ITENS_NAV.filter((item) => item.permissao === null || temPermissao(permissoesDoPapel, item.permissao));
}
