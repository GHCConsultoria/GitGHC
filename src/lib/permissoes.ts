import type { Usuario } from "@prisma/client";

/**
 * O papel do usuário (ADVOGADO/ASSISTENTE) hoje era só um rótulo de exibição
 * — nunca restringia nada. Esta é a única fonte de verdade sobre quem pode
 * fazer o quê; toda ação que decide sobre um prazo ou sobre quem tem acesso
 * ao sistema passa por aqui antes de agir. ASSISTENTE continua vendo tudo
 * (mesmo escritório, mesma visibilidade) — a restrição é só sobre AÇÕES de
 * responsabilidade legal (confirmar/editar/descartar/marcar cumprido um
 * prazo, cadastrar gente nova no escritório).
 */
export function podeConfirmarPrazos(usuario: Pick<Usuario, "role">): boolean {
  return usuario.role === "ADVOGADO";
}

export function podeGerenciarUsuarios(usuario: Pick<Usuario, "role">): boolean {
  return usuario.role === "ADVOGADO";
}

export const MENSAGEM_APENAS_ADVOGADO = "apenas advogados podem fazer isto";
