"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { obterSessaoImob } from "@/lib/imob/auth";
import { obterPapelDoTenant, obterUsuarioDoTenant } from "@/lib/imob/consultas";
import { prismaImob } from "@/lib/imob/prisma";
import { exigirPermissao, PermissaoNegadaError, sanitizarPermissoes } from "@/lib/imob/rbac";
import {
  criarPapelSchema,
  criarUsuarioSchema,
  dadosImobiliariaSchema,
  editarPapelSchema,
  editarUsuarioSchema,
} from "@/lib/imob/schemas";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

const SUPABASE_CONFIGURADO = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Converte qualquer erro numa mensagem amigável, sem vazar stack/SQL. Erro de
 * permissão vira mensagem clara; o resto vira uma genérica (o detalhe técnico
 * fica nos logs do servidor).
 */
function paraMensagem(erro: unknown, generica: string): string {
  if (erro instanceof PermissaoNegadaError) {
    return "Você não tem permissão para esta ação.";
  }
  console.error("[imob] acao falhou:", erro);
  return generica;
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export async function criarUsuario(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "usuarios.criar");

    const parsed = criarUsuarioSchema.safeParse({
      nome: formData.get("nome"),
      email: formData.get("email"),
      senha: formData.get("senha"),
      telefone: formData.get("telefone") || undefined,
      papelId: formData.get("papelId"),
    });
    if (!parsed.success) {
      return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    }

    const papel = await obterPapelDoTenant(sessao.imobiliariaId, parsed.data.papelId);
    if (!papel) {
      return { sucesso: false, erro: "papel inválido" };
    }

    if (!SUPABASE_CONFIGURADO) {
      return { sucesso: false, erro: "Supabase ainda não está configurado neste ambiente (ver .env.example)." };
    }

    let supabaseAdmin: ReturnType<typeof criarClienteSupabaseAdmin>;
    try {
      supabaseAdmin = criarClienteSupabaseAdmin();
    } catch (erro) {
      return { sucesso: false, erro: erro instanceof Error ? erro.message : "Supabase admin não configurado" };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.senha,
      email_confirm: true,
    });
    if (error || !data.user) {
      return { sucesso: false, erro: "e-mail já cadastrado ou inválido" };
    }
    const authUserId = data.user.id;

    try {
      await prismaImob.$transaction(async (tx) => {
        const novo = await tx.usuarioImob.create({
          data: {
            authUserId,
            nome: parsed.data.nome,
            email: parsed.data.email,
            telefone: parsed.data.telefone || null,
            papelId: papel.id,
            imobiliariaId: sessao.imobiliariaId,
          },
        });
        await registrarAuditoria(
          {
            imobiliariaId: sessao.imobiliariaId,
            usuarioId: sessao.id,
            entidade: "UsuarioImob",
            entidadeId: novo.id,
            acao: "criar",
            valorNovo: { nome: novo.nome, email: novo.email, papel: papel.nome },
          },
          tx,
        );
      });
    } catch (erro) {
      // rollback do usuário Auth órfão (mesmo cuidado do vertical nutri)
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o usuário") };
    }

    revalidatePath("/imob/usuarios");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o usuário") };
  }
}

export async function editarUsuario(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "usuarios.editar");

    const parsed = editarUsuarioSchema.safeParse({
      usuarioId: formData.get("usuarioId"),
      nome: formData.get("nome"),
      telefone: formData.get("telefone") || undefined,
      papelId: formData.get("papelId"),
      status: formData.get("status"),
    });
    if (!parsed.success) {
      return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    }

    const alvo = await obterUsuarioDoTenant(sessao.imobiliariaId, parsed.data.usuarioId);
    if (!alvo) {
      return { sucesso: false, erro: "usuário não encontrado" };
    }
    const papel = await obterPapelDoTenant(sessao.imobiliariaId, parsed.data.papelId);
    if (!papel) {
      return { sucesso: false, erro: "papel inválido" };
    }

    // Trava de segurança: não deixar o usuário rebaixar/inativar a si mesmo e
    // ficar sem administrador. Simplicidade > sofisticação nesta fase.
    if (alvo.id === sessao.id && parsed.data.status === "INATIVO") {
      return { sucesso: false, erro: "você não pode inativar o próprio usuário" };
    }

    await prismaImob.$transaction(async (tx) => {
      await tx.usuarioImob.update({
        where: { id: alvo.id },
        data: {
          nome: parsed.data.nome,
          telefone: parsed.data.telefone || null,
          papelId: papel.id,
          status: parsed.data.status,
        },
      });
      await registrarAuditoria(
        {
          imobiliariaId: sessao.imobiliariaId,
          usuarioId: sessao.id,
          entidade: "UsuarioImob",
          entidadeId: alvo.id,
          acao: "editar",
          valorAnterior: { nome: alvo.nome, papel: alvo.papel.nome, status: alvo.status },
          valorNovo: { nome: parsed.data.nome, papel: papel.nome, status: parsed.data.status },
        },
        tx,
      );
    });

    revalidatePath("/imob/usuarios");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o usuário") };
  }
}

// ---------------------------------------------------------------------------
// Papéis
// ---------------------------------------------------------------------------

function lerPermissoesDoForm(formData: FormData): string[] {
  return formData.getAll("permissoes").map(String);
}

export async function criarPapel(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "papeis.criar");

    const parsed = criarPapelSchema.safeParse({
      nome: formData.get("nome"),
      descricao: formData.get("descricao") || undefined,
      permissoes: lerPermissoesDoForm(formData),
    });
    if (!parsed.success) {
      return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    }

    const permissoes = sanitizarPermissoes(parsed.data.permissoes);

    try {
      const criado = await prismaImob.papel.create({
        data: {
          imobiliariaId: sessao.imobiliariaId,
          nome: parsed.data.nome,
          descricao: parsed.data.descricao || null,
          sistema: false,
          permissoes,
        },
      });
      await registrarAuditoria({
        imobiliariaId: sessao.imobiliariaId,
        usuarioId: sessao.id,
        entidade: "Papel",
        entidadeId: criado.id,
        acao: "criar",
        valorNovo: { nome: criado.nome, permissoes },
      });
    } catch {
      return { sucesso: false, erro: "já existe um papel com esse nome" };
    }

    revalidatePath("/imob/papeis");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o papel") };
  }
}

export async function editarPapel(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "papeis.editar");

    const parsed = editarPapelSchema.safeParse({
      papelId: formData.get("papelId"),
      nome: formData.get("nome"),
      descricao: formData.get("descricao") || undefined,
      permissoes: lerPermissoesDoForm(formData),
    });
    if (!parsed.success) {
      return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    }

    const papel = await obterPapelDoTenant(sessao.imobiliariaId, parsed.data.papelId);
    if (!papel) {
      return { sucesso: false, erro: "papel não encontrado" };
    }
    if (papel.sistema) {
      return { sucesso: false, erro: "papéis padrão do sistema não podem ser editados" };
    }

    const permissoes = sanitizarPermissoes(parsed.data.permissoes);

    await prismaImob.$transaction(async (tx) => {
      await tx.papel.update({
        where: { id: papel.id },
        data: { nome: parsed.data.nome, descricao: parsed.data.descricao || null, permissoes },
      });
      await registrarAuditoria(
        {
          imobiliariaId: sessao.imobiliariaId,
          usuarioId: sessao.id,
          entidade: "Papel",
          entidadeId: papel.id,
          acao: "editar",
          valorAnterior: { nome: papel.nome, permissoes: papel.permissoes },
          valorNovo: { nome: parsed.data.nome, permissoes },
        },
        tx,
      );
    });

    revalidatePath("/imob/papeis");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o papel") };
  }
}

// ---------------------------------------------------------------------------
// Configurações da imobiliária
// ---------------------------------------------------------------------------

export async function salvarConfiguracoes(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "configuracoes.editar");

    const parsed = dadosImobiliariaSchema.safeParse({
      nome: formData.get("nome"),
      cnpj: formData.get("cnpj") || undefined,
      creci: formData.get("creci") || undefined,
      email: formData.get("email") || undefined,
      telefone: formData.get("telefone") || undefined,
      cep: formData.get("cep") || undefined,
      logradouro: formData.get("logradouro") || undefined,
      numero: formData.get("numero") || undefined,
      complemento: formData.get("complemento") || undefined,
      bairro: formData.get("bairro") || undefined,
      cidade: formData.get("cidade") || undefined,
      estado: formData.get("estado") || undefined,
      corPrimaria: formData.get("corPrimaria") || undefined,
    });
    if (!parsed.success) {
      return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    }

    const d = parsed.data;
    await prismaImob.imobiliaria.update({
      where: { id: sessao.imobiliariaId },
      data: {
        nome: d.nome,
        cnpj: d.cnpj || null,
        creci: d.creci || null,
        email: d.email || null,
        telefone: d.telefone || null,
        cep: d.cep || null,
        logradouro: d.logradouro || null,
        numero: d.numero || null,
        complemento: d.complemento || null,
        bairro: d.bairro || null,
        cidade: d.cidade || null,
        estado: d.estado || null,
        ...(d.corPrimaria ? { corPrimaria: d.corPrimaria } : {}),
      },
    });

    await registrarAuditoria({
      imobiliariaId: sessao.imobiliariaId,
      usuarioId: sessao.id,
      entidade: "Imobiliaria",
      entidadeId: sessao.imobiliariaId,
      acao: "editar-configuracoes",
      valorNovo: { nome: d.nome },
    });

    revalidatePath("/imob/configuracoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível salvar as configurações") };
  }
}

/** Marca o onboarding como concluído (chamado ao final do wizard). */
export async function concluirOnboarding(): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "configuracoes.editar");
    await prismaImob.imobiliaria.update({
      where: { id: sessao.imobiliariaId },
      data: { onboardingConcluido: true },
    });
    revalidatePath("/imob");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível concluir o onboarding") };
  }
}
