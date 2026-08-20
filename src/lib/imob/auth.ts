import { prismaImob } from "@/lib/imob/prisma";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Imobiliaria, Papel, UsuarioImob } from "../../../prisma/imob/generated";

const SUPABASE_CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** authUserId do admin demo semeado — usado no fallback sem Supabase. */
export const AUTH_USER_ID_DEMO = "demo-imob-admin-auth-id";

export class UsuarioImobNaoAutenticadoError extends Error {}
export class UsuarioImobNaoCadastradoError extends Error {}

/** Usuário logado já com papel (permissões) e imobiliária (tenant) resolvidos. */
export type SessaoImob = UsuarioImob & { papel: Papel; imobiliaria: Imobiliaria };

/**
 * Resolve o UsuarioImob da requisição atual, com papel e imobiliária. Mesmo
 * padrão de src/lib/nutri/auth.ts: com Supabase configurado lê a sessão real
 * (o middleware já barrou quem não tem sessão antes de chegar aqui); sem
 * Supabase configurado, cai no usuário demo semeado, só pra o painel navegar
 * localmente.
 */
export async function obterSessaoImob(): Promise<SessaoImob> {
  if (!SUPABASE_CONFIGURADO) {
    const demo = await prismaImob.usuarioImob.findUnique({
      where: { authUserId: AUTH_USER_ID_DEMO },
      include: { papel: true, imobiliaria: true },
    });
    if (!demo) {
      throw new Error("usuario imob demo nao encontrado — rode 'npm run db:seed:imob' antes de usar o painel");
    }
    return demo;
  }

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UsuarioImobNaoAutenticadoError("sem sessao Supabase ativa");
  }

  const usuario = await prismaImob.usuarioImob.findUnique({
    where: { authUserId: user.id },
    include: { papel: true, imobiliaria: true },
  });
  if (!usuario) {
    throw new UsuarioImobNaoCadastradoError(
      `usuario Supabase ${user.email ?? user.id} autenticado, mas sem UsuarioImob correspondente`,
    );
  }

  return usuario;
}

/**
 * Registra o instante do login. Chamada no fluxo de sessão (após login).
 * Silenciosa: falhar em anotar o último acesso nunca deve derrubar o login.
 */
export async function registrarUltimoAcesso(authUserId: string): Promise<void> {
  try {
    await prismaImob.usuarioImob.update({
      where: { authUserId },
      data: { ultimoAcessoEm: new Date() },
    });
  } catch {
    // usuário Auth sem UsuarioImob (ainda em onboarding) ou banco indisponível
    // — não é fatal para a sessão.
  }
}
