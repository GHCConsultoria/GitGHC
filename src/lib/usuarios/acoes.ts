"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RoleUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

export type ResultadoCriarUsuario =
  | { sucesso: true; email: string; senhaTemporaria: string }
  | { sucesso: false; erro: string };

const criarUsuarioSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome"),
  email: z.string().trim().email("e-mail inválido"),
  role: z.nativeEnum(RoleUsuario),
});

function gerarSenhaTemporaria(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%";
  const bytes = crypto.randomBytes(16);
  let senha = "";
  for (let i = 0; i < bytes.length; i++) {
    senha += alfabeto[bytes[i] % alfabeto.length];
  }
  return senha;
}

/**
 * Cria um usuário novo no escritório de quem está logado: usuário no
 * Supabase Auth (já confirmado, com senha temporária) + a linha Usuario
 * correspondente. A senha só é mostrada uma vez, na resposta desta ação —
 * quem cadastrou precisa repassar pra pessoa, que troca no primeiro login.
 */
export async function criarUsuario(input: unknown): Promise<ResultadoCriarUsuario> {
  const parsed = criarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuarioAtual = await obterUsuarioAtual();

  let supabaseAdmin: ReturnType<typeof criarClienteSupabaseAdmin>;
  try {
    supabaseAdmin = criarClienteSupabaseAdmin();
  } catch (erro) {
    return { sucesso: false, erro: erro instanceof Error ? erro.message : "Supabase admin não configurado" };
  }

  const senhaTemporaria = gerarSenhaTemporaria();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: senhaTemporaria,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { sucesso: false, erro: error?.message ?? "falha ao criar usuário no Supabase Auth" };
  }

  try {
    await prisma.usuario.create({
      data: {
        authUserId: data.user.id,
        nome: parsed.data.nome,
        email: parsed.data.email,
        role: parsed.data.role,
        escritorioId: usuarioAtual.escritorioId,
      },
    });
  } catch (erroBanco) {
    // Sem isso, uma falha aqui deixaria um usuário Auth órfão, sem Usuario
    // correspondente — nunca conseguiria logar e ninguém saberia por quê.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw erroBanco;
  }

  revalidatePath("/usuarios");
  return { sucesso: true, email: parsed.data.email, senhaTemporaria };
}
