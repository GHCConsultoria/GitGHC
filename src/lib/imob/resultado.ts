import { PermissaoNegadaError } from "@/lib/imob/rbac";

/** Retorno padrão das server actions do produto imobiliário. */
export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };
export type ResultadoComId = { sucesso: true; id: string } | { sucesso: false; erro: string };

/**
 * Converte qualquer erro numa mensagem amigável, sem vazar stack/SQL ao
 * usuário. Erro de permissão vira mensagem clara; o resto vira uma genérica,
 * com o detalhe técnico só nos logs do servidor.
 */
export function paraMensagem(erro: unknown, generica: string): string {
  if (erro instanceof PermissaoNegadaError) {
    return "Você não tem permissão para esta ação.";
  }
  console.error("[imob] acao falhou:", erro);
  return generica;
}
