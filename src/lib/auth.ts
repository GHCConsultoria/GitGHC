import { prisma } from "@/lib/prisma";
import type { Usuario } from "@prisma/client";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

const SUPABASE_CONFIGURADO = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export class UsuarioNaoAutenticadoError extends Error {}
export class UsuarioNaoCadastradoError extends Error {}

/**
 * Resolve o Usuario da requisição atual. Com Supabase configurado, lê a
 * sessão real (o middleware.ts já deve ter redirecionado para /login antes
 * de qualquer Server Component chegar aqui sem sessão — isto é a segunda
 * trava) e busca o Usuario por authUserId.
 *
 * Sem NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY configurados —
 * o caso deste ambiente de desenvolvimento — cai no usuário demo semeado na
 * Fase 1, só para o painel continuar navegável localmente.
 */
export async function obterUsuarioAtual(): Promise<Usuario> {
  if (!SUPABASE_CONFIGURADO) {
    const usuarioDemo = await prisma.usuario.findUnique({ where: { authUserId: "demo-advogado-auth-id" } });
    if (!usuarioDemo) {
      throw new Error("usuario demo nao encontrado — rode 'npx prisma db seed' antes de usar o painel");
    }
    return usuarioDemo;
  }

  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UsuarioNaoAutenticadoError("sem sessao Supabase ativa");
  }

  const usuario = await prisma.usuario.findUnique({ where: { authUserId: user.id } });
  if (!usuario) {
    throw new UsuarioNaoCadastradoError(
      `usuario Supabase ${user.email ?? user.id} autenticado, mas sem Usuario correspondente no banco`,
    );
  }

  return usuario;
}
