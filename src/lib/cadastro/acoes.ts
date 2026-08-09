"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { UFS_BRASIL } from "@/lib/br/ufs";

export interface EstadoCadastro {
  erro?: string;
}

const cadastrarEscritorioSchema = z.object({
  nomeEscritorio: z.string().trim().min(1, "informe o nome do escritório"),
  oab: z.string().trim().min(1, "informe a OAB"),
  uf: z.enum(UFS_BRASIL),
  nome: z.string().trim().min(1, "informe seu nome"),
  email: z.string().trim().email("e-mail inválido"),
  senha: z.string().min(6, "a senha deve ter pelo menos 6 caracteres"),
});

/**
 * Cadastro público de escritório: cria o Escritorio, o usuário no Supabase
 * Auth (já confirmado — sem fluxo de confirmação por e-mail, pra não
 * depender de SMTP configurado) e o Usuario correspondente com role
 * ADVOGADO (quem cadastra o escritório é sempre o primeiro advogado —
 * outros usuários são convidados depois em /usuarios). Loga a pessoa
 * automaticamente ao final, sem passo extra de login.
 *
 * Diferente de criarUsuario (src/lib/usuarios/acoes.ts), que só adiciona
 * alguém a um escritório já existente e exige sessão de um ADVOGADO — este
 * fluxo não exige nenhuma sessão prévia, é a porta de entrada de um
 * escritório novo no sistema.
 */
export async function cadastrarEscritorio(
  _estadoAnterior: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const parsed = cadastrarEscritorioSchema.safeParse({
    nomeEscritorio: formData.get("nomeEscritorio"),
    oab: formData.get("oab"),
    uf: formData.get("uf"),
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { erro: "Supabase ainda não está configurado neste ambiente (ver .env.example)." };
  }

  let supabaseAdmin: ReturnType<typeof criarClienteSupabaseAdmin>;
  try {
    supabaseAdmin = criarClienteSupabaseAdmin();
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Supabase admin não configurado" };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
  });

  if (error || !data.user) {
    // Supabase Auth já valida e-mail duplicado — repassa a mensagem exata
    // em vez de uma genérica, o dado mais útil que dá pra dar aqui.
    return { erro: error?.message ?? "não foi possível criar a conta" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const escritorio = await tx.escritorio.create({
        data: { nome: parsed.data.nomeEscritorio, oab: parsed.data.oab, uf: parsed.data.uf },
      });

      await tx.usuario.create({
        data: {
          authUserId: data.user.id,
          nome: parsed.data.nome,
          email: parsed.data.email,
          role: "ADVOGADO",
          escritorioId: escritorio.id,
        },
      });
    });
  } catch (erroBanco) {
    // Mesma trava de orfandade do criarUsuario: sem isso, uma falha aqui
    // deixaria um usuário Auth sem Escritorio/Usuario correspondente.
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw erroBanco;
  }

  const supabase = await criarClienteSupabaseServidor();
  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (erroLogin) {
    // Conta criada com sucesso, só o login automático que falhou — manda
    // pro /login em vez de fingir que deu tudo certo.
    redirect("/login");
  }

  redirect("/");
}
