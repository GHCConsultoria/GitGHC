"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import type { ResultadoAcao } from "./acoes";

function primeiraMensagemDeErro(erro: z.ZodError, fallback: string): string {
  return erro.issues[0]?.message ?? fallback;
}

const criarTarefaSchema = z.object({
  prazoId: z.string().min(1),
  descricao: z.string().trim().min(3, "descrição deve ter pelo menos 3 caracteres"),
  responsavelId: z.string().min(1).optional(),
});

/** Cria uma tarefa vinculada a um prazo — transforma o prazo em ação concreta ("elaborar contestação" etc.). */
export async function criarTarefa(input: unknown): Promise<ResultadoAcao> {
  const parsed = criarTarefaSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  const prazo = await prisma.prazo.findUnique({ where: { id: parsed.data.prazoId } });
  if (!prazo) return { sucesso: false, erro: "prazo nao encontrado" };

  if (parsed.data.responsavelId) {
    const responsavel = await prisma.usuario.findUnique({ where: { id: parsed.data.responsavelId } });
    if (!responsavel || responsavel.escritorioId !== usuario.escritorioId) {
      return { sucesso: false, erro: "responsavel invalido" };
    }
  }

  const tarefa = await prisma.tarefaPrazo.create({
    data: {
      prazoId: prazo.id,
      descricao: parsed.data.descricao,
      responsavelId: parsed.data.responsavelId ?? null,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "TarefaPrazo",
      entidadeId: tarefa.id,
      acao: "CRIAR",
      valorNovo: { prazoId: prazo.id, descricao: tarefa.descricao, responsavelId: tarefa.responsavelId },
    },
  });

  revalidatePath("/");
  return { sucesso: true };
}

const concluirTarefaSchema = z.object({ tarefaId: z.string().min(1) });

/** Marca uma tarefa como concluída — auditado (quem, quando). */
export async function concluirTarefa(input: unknown): Promise<ResultadoAcao> {
  const parsed = concluirTarefaSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  const tarefa = await prisma.tarefaPrazo.findUnique({ where: { id: parsed.data.tarefaId } });
  if (!tarefa) return { sucesso: false, erro: "tarefa nao encontrada" };
  if (tarefa.status !== "PENDENTE") {
    return { sucesso: false, erro: `tarefa nao esta pendente (status atual: ${tarefa.status})` };
  }

  const agora = new Date();
  await prisma.$transaction([
    prisma.tarefaPrazo.update({
      where: { id: tarefa.id },
      data: { status: "CONCLUIDA", concluidoPorId: usuario.id, concluidoEm: agora },
    }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "TarefaPrazo",
        entidadeId: tarefa.id,
        acao: "CONCLUIR",
        valorAnterior: { status: tarefa.status },
        valorNovo: { status: "CONCLUIDA", concluidoPorId: usuario.id, concluidoEm: agora.toISOString() },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}

const reabrirTarefaSchema = z.object({ tarefaId: z.string().min(1) });

/** Reabre uma tarefa concluída por engano — mantém o histórico anterior no log, nunca sobrescreve silenciosamente. */
export async function reabrirTarefa(input: unknown): Promise<ResultadoAcao> {
  const parsed = reabrirTarefaSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  const tarefa = await prisma.tarefaPrazo.findUnique({ where: { id: parsed.data.tarefaId } });
  if (!tarefa) return { sucesso: false, erro: "tarefa nao encontrada" };
  if (tarefa.status !== "CONCLUIDA") {
    return { sucesso: false, erro: `tarefa nao esta concluida (status atual: ${tarefa.status})` };
  }

  await prisma.$transaction([
    prisma.tarefaPrazo.update({
      where: { id: tarefa.id },
      data: { status: "PENDENTE", concluidoPorId: null, concluidoEm: null },
    }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "TarefaPrazo",
        entidadeId: tarefa.id,
        acao: "REABRIR",
        valorAnterior: { status: tarefa.status, concluidoPorId: tarefa.concluidoPorId },
        valorNovo: { status: "PENDENTE" },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}

const atribuirResponsavelPrazoSchema = z.object({
  prazoId: z.string().min(1),
  responsavelId: z.string().min(1).nullable(),
});

/** Define/remove o responsável por um prazo — independente de quem confirma a data fatal. */
export async function atribuirResponsavelPrazo(input: unknown): Promise<ResultadoAcao> {
  const parsed = atribuirResponsavelPrazoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: primeiraMensagemDeErro(parsed.error, "payload invalido") };
  }

  const usuario = await obterUsuarioAtual();
  const prazo = await prisma.prazo.findUnique({ where: { id: parsed.data.prazoId } });
  if (!prazo) return { sucesso: false, erro: "prazo nao encontrado" };

  if (parsed.data.responsavelId) {
    const responsavel = await prisma.usuario.findUnique({ where: { id: parsed.data.responsavelId } });
    if (!responsavel || responsavel.escritorioId !== usuario.escritorioId) {
      return { sucesso: false, erro: "responsavel invalido" };
    }
  }

  await prisma.$transaction([
    prisma.prazo.update({ where: { id: prazo.id }, data: { responsavelId: parsed.data.responsavelId } }),
    prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Prazo",
        entidadeId: prazo.id,
        acao: "ATRIBUIR_RESPONSAVEL",
        valorAnterior: { responsavelId: prazo.responsavelId },
        valorNovo: { responsavelId: parsed.data.responsavelId },
      },
    }),
  ]);

  revalidatePath("/");
  return { sucesso: true };
}
