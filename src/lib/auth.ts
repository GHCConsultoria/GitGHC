import { prisma } from "@/lib/prisma";
import type { Usuario } from "@prisma/client";

// TODO(auth real): este MVP ainda não tem Supabase Auth conectado (as
// variáveis NEXT_PUBLIC_SUPABASE_* estão vazias em .env.example). Enquanto
// isso não for resolvido, toda ação da tela de confirmação atua como o único
// usuário demo semeado pela Fase 1. Antes de expor isto além do ambiente
// local, troque esta função por uma leitura da sessão Supabase (cookie
// `sb-*`) e resolva o Usuario correspondente por authUserId.
export async function obterUsuarioAtual(): Promise<Usuario> {
  const usuario = await prisma.usuario.findUnique({ where: { authUserId: "demo-advogado-auth-id" } });
  if (!usuario) {
    throw new Error(
      "usuario demo nao encontrado — rode 'npx prisma db seed' antes de usar o painel",
    );
  }
  return usuario;
}
