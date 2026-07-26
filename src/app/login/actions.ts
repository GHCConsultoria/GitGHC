"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

const entrarSchema = z.object({
  email: z.string().email("informe um e-mail válido"),
  senha: z.string().min(6, "a senha deve ter pelo menos 6 caracteres"),
});

export interface EstadoLogin {
  erro?: string;
}

/**
 * Login por e-mail/senha via Supabase Auth. Não há cadastro público aqui de
 * propósito: o usuário do Supabase Auth e a linha correspondente em Usuario
 * (authUserId) são provisionados pelo escritório/admin, fora deste fluxo —
 * ver TODO em src/lib/auth.ts.
 */
export async function entrar(_estadoAnterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const parsed = entrarSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { erro: "Supabase ainda não está configurado neste ambiente (ver .env.example)." };
  }

  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (error) {
    return { erro: "e-mail ou senha incorretos" };
  }

  redirect("/");
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
