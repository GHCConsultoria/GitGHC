"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { podeConfirmarPrazos, MENSAGEM_APENAS_ADVOGADO } from "@/lib/permissoes";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

function primeiraMensagemDeErro(erro: z.ZodError, fallback: string): string {
  return erro.issues[0]?.message ?? fallback;
}

const confirmarPrazoSchema = z.object({ prazoId: z.string().min(1) });

/** Confirmar: única forma de um prazo sair de PENDENTE_CONFIRMACAO para CONFIRMADO. Sempre auditado. Só ADVOGADO — é quem carrega a responsabilidade legal pela data. */
export async function confirmarPrazo(input: unknown): Promise<ResultadoAcao> {
  const parsed = confirmarPrazoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  if (!podeConfirmarPrazos(usuario)) {
    return { sucesso: false, erro: MENSAGEM_APENAS_ADVOGADO };
  }
  const prazo = await prisma.prazo.findUnique({ where: { id: parsed.data.prazoId } });
  if (!prazo) return { sucesso: false, erro: "prazo nao encontrado" };
  if (prazo.status !== "PENDENTE_CONFIRMACAO") {
    return { sucesso: false, erro: `prazo nao esta pendente de confirmacao (status atual: ${prazo.status})` };
  }

  const agora = new Date();
  await prisma.$transaction([
    prisma.prazo.update({
      where: { id: prazo.id },
      data: { status: "CONFIRMADO", confirmadoPorId: usuario.id, confirmadoEm: agora },
    }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Prazo",
        entidadeId: prazo.id,
        acao: "CONFIRMAR",
        valorAnterior: { status: prazo.status },
        valorNovo: { status: "CONFIRMADO", confirmadoPorId: usuario.id, confirmadoEm: agora.toISOString() },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}

const editarDataFatalSchema = z.object({
  prazoId: z.string().min(1),
  novaDataFatal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato AAAA-MM-DD"),
  justificativa: z.string().trim().min(5, "justificativa deve ter pelo menos 5 caracteres"),
});

/** Editar data: corrige o valor proposto pelo motor sem confirmar — a justificativa é obrigatória e auditada. */
export async function editarDataFatalPrazo(input: unknown): Promise<ResultadoAcao> {
  const parsed = editarDataFatalSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  if (!podeConfirmarPrazos(usuario)) {
    return { sucesso: false, erro: MENSAGEM_APENAS_ADVOGADO };
  }
  const prazo = await prisma.prazo.findUnique({ where: { id: parsed.data.prazoId } });
  if (!prazo) return { sucesso: false, erro: "prazo nao encontrado" };
  if (prazo.status !== "PENDENTE_CONFIRMACAO") {
    return { sucesso: false, erro: `prazo nao esta pendente de confirmacao (status atual: ${prazo.status})` };
  }

  const novaData = new Date(`${parsed.data.novaDataFatal}T00:00:00Z`);

  await prisma.$transaction([
    prisma.prazo.update({ where: { id: prazo.id }, data: { dataFatal: novaData } }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Prazo",
        entidadeId: prazo.id,
        acao: "EDITAR_DATA_FATAL",
        valorAnterior: { dataFatal: prazo.dataFatal.toISOString() },
        valorNovo: { dataFatal: novaData.toISOString(), justificativa: parsed.data.justificativa },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}

const descartarPrazoSchema = z.object({
  prazoId: z.string().min(1),
  motivo: z.string().trim().min(5, "motivo deve ter pelo menos 5 caracteres"),
});

/** Descartar: nunca apaga a linha, só muda o status — o motivo fica no log de auditoria. */
export async function descartarPrazo(input: unknown): Promise<ResultadoAcao> {
  const parsed = descartarPrazoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  if (!podeConfirmarPrazos(usuario)) {
    return { sucesso: false, erro: MENSAGEM_APENAS_ADVOGADO };
  }
  const prazo = await prisma.prazo.findUnique({ where: { id: parsed.data.prazoId } });
  if (!prazo) return { sucesso: false, erro: "prazo nao encontrado" };
  if (prazo.status !== "PENDENTE_CONFIRMACAO") {
    return { sucesso: false, erro: `prazo nao esta pendente de confirmacao (status atual: ${prazo.status})` };
  }

  await prisma.$transaction([
    prisma.prazo.update({ where: { id: prazo.id }, data: { status: "DESCARTADO" } }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Prazo",
        entidadeId: prazo.id,
        acao: "DESCARTAR",
        valorAnterior: { status: prazo.status },
        valorNovo: { status: "DESCARTADO", motivo: parsed.data.motivo },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}

const marcarComoCumpridoSchema = z.object({ prazoId: z.string().min(1) });

/** Marca um prazo CONFIRMADO como CUMPRIDO — o ato foi de fato praticado. Auditado. */
export async function marcarPrazoComoCumprido(input: unknown): Promise<ResultadoAcao> {
  const parsed = marcarComoCumpridoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  if (!podeConfirmarPrazos(usuario)) {
    return { sucesso: false, erro: MENSAGEM_APENAS_ADVOGADO };
  }
  const prazo = await prisma.prazo.findUnique({ where: { id: parsed.data.prazoId } });
  if (!prazo) return { sucesso: false, erro: "prazo nao encontrado" };
  if (prazo.status !== "CONFIRMADO") {
    return { sucesso: false, erro: `prazo nao esta confirmado (status atual: ${prazo.status})` };
  }

  await prisma.$transaction([
    prisma.prazo.update({ where: { id: prazo.id }, data: { status: "CUMPRIDO" } }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Prazo",
        entidadeId: prazo.id,
        acao: "MARCAR_CUMPRIDO",
        valorAnterior: { status: prazo.status },
        valorNovo: { status: "CUMPRIDO" },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}

const vincularPublicacaoSchema = z.object({
  publicacaoId: z.string().min(1),
  processoId: z.string().min(1),
});

/** Vincula manualmente uma publicação NAO_IDENTIFICADA a um processo existente do escritório. */
export async function vincularPublicacaoAProcesso(input: unknown): Promise<ResultadoAcao> {
  const parsed = vincularPublicacaoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  const publicacao = await prisma.publicacao.findUnique({ where: { id: parsed.data.publicacaoId } });
  if (!publicacao) return { sucesso: false, erro: "publicacao nao encontrada" };
  if (publicacao.status !== "NAO_IDENTIFICADA") {
    return {
      sucesso: false,
      erro: `publicacao nao esta na fila de nao identificadas (status atual: ${publicacao.status})`,
    };
  }
  const processo = await prisma.processo.findUnique({ where: { id: parsed.data.processoId } });
  if (!processo) return { sucesso: false, erro: "processo nao encontrado" };

  await prisma.$transaction([
    prisma.publicacao.update({
      where: { id: publicacao.id },
      data: { status: "VINCULADA", processoId: processo.id },
    }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Publicacao",
        entidadeId: publicacao.id,
        acao: "VINCULAR_MANUAL",
        valorAnterior: { status: publicacao.status, processoId: publicacao.processoId },
        valorNovo: { status: "VINCULADA", processoId: processo.id },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}
