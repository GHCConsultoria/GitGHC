"use server";

import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { registrarUltimoAcesso } from "@/lib/imob/auth";
import { prismaImob } from "@/lib/imob/prisma";
import { provisionarPapeisPadrao } from "@/lib/imob/provisionamento";
import { cadastroImobiliariaSchema } from "@/lib/imob/schemas";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export interface EstadoLoginImob {
  erro?: string;
}

function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Login por e-mail/senha via Supabase Auth. */
export async function entrarUsuarioImob(
  _estadoAnterior: EstadoLoginImob,
  formData: FormData,
): Promise<EstadoLoginImob> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (!email || senha.length < 6) {
    return { erro: "informe e-mail e senha (mínimo 6 caracteres)" };
  }

  if (!supabaseConfigurado()) {
    return { erro: "Supabase ainda não está configurado neste ambiente (ver .env.example)." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    return { erro: "e-mail ou senha incorretos" };
  }

  await registrarUltimoAcesso(data.user.id);
  redirect("/imob");
}

/**
 * Cadastro self-service de uma nova imobiliária: cria o usuário no Supabase
 * Auth + o tenant (Imobiliaria) + os papéis padrão + o primeiro usuário
 * Administrador, tudo numa transação. É o ponto de entrada do onboarding.
 */
export async function cadastrarImobiliaria(
  _estadoAnterior: EstadoLoginImob,
  formData: FormData,
): Promise<EstadoLoginImob> {
  const parsed = cadastroImobiliariaSchema.safeParse({
    nomeImobiliaria: formData.get("nomeImobiliaria"),
    nomeAdmin: formData.get("nomeAdmin"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
  }

  if (!supabaseConfigurado()) {
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
    return { erro: "e-mail já cadastrado ou inválido" };
  }
  const authUserId = data.user.id;

  try {
    await prismaImob.$transaction(async (tx) => {
      const imobiliaria = await tx.imobiliaria.create({
        data: { nome: parsed.data.nomeImobiliaria },
      });
      const { admin } = await provisionarPapeisPadrao(tx, imobiliaria.id);
      const usuario = await tx.usuarioImob.create({
        data: {
          authUserId,
          nome: parsed.data.nomeAdmin,
          email: parsed.data.email,
          papelId: admin.id,
          imobiliariaId: imobiliaria.id,
        },
      });
      await registrarAuditoria(
        {
          imobiliariaId: imobiliaria.id,
          usuarioId: usuario.id,
          entidade: "Imobiliaria",
          entidadeId: imobiliaria.id,
          acao: "cadastro-inicial",
          valorNovo: { nome: imobiliaria.nome, admin: usuario.email },
        },
        tx,
      );
    });
  } catch (erro) {
    // rollback do usuário Auth órfão — sem isto ele nunca conseguiria logar
    await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
    console.error("[imob] cadastro de imobiliaria falhou:", erro);
    return { erro: "não foi possível concluir o cadastro — tente novamente" };
  }

  const supabase = await criarClienteSupabaseServidor();
  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (erroLogin) {
    return { erro: "conta criada, mas o login automático falhou — entre manualmente" };
  }

  redirect("/imob/onboarding");
}

export async function sairUsuarioImob(): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  await supabase.auth.signOut();
  redirect("/imob/login");
}
