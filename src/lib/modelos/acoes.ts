"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { preencherModelo } from "@/lib/modelos/preenchimento";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

const modeloSchema = z.object({
  titulo: z.string().trim().min(1, "informe um título"),
  tipoAto: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  conteudo: z.string().trim().min(1, "o conteúdo não pode ficar em branco"),
});

/** Cria um modelo de petição para o escritório de quem está logado. */
export async function criarModelo(input: unknown): Promise<ResultadoAcao> {
  const parsed = modeloSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();

  await prisma.modeloPeticao.create({
    data: {
      titulo: parsed.data.titulo,
      tipoAto: parsed.data.tipoAto ?? null,
      conteudo: parsed.data.conteudo,
      escritorioId: usuario.escritorioId,
      criadoPorId: usuario.id,
    },
  });

  revalidatePath("/modelos");
  return { sucesso: true };
}

const editarModeloSchema = modeloSchema.extend({ modeloId: z.string().min(1) });

/** Edita um modelo existente do mesmo escritório. */
export async function editarModelo(input: unknown): Promise<ResultadoAcao> {
  const parsed = editarModeloSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const modelo = await prisma.modeloPeticao.findUnique({ where: { id: parsed.data.modeloId } });
  if (!modelo || modelo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "modelo não encontrado neste escritório" };
  }

  await prisma.modeloPeticao.update({
    where: { id: modelo.id },
    data: { titulo: parsed.data.titulo, tipoAto: parsed.data.tipoAto ?? null, conteudo: parsed.data.conteudo },
  });

  revalidatePath("/modelos");
  return { sucesso: true };
}

const excluirModeloSchema = z.object({ modeloId: z.string().min(1) });

/**
 * Exclusão física, ao contrário de Prazo/Processo/Publicação: um modelo é
 * configuração editável do escritório, não um registro de decisão que
 * precise de trilha de auditoria permanente.
 */
export async function excluirModelo(input: unknown): Promise<ResultadoAcao> {
  const parsed = excluirModeloSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const modelo = await prisma.modeloPeticao.findUnique({ where: { id: parsed.data.modeloId } });
  if (!modelo || modelo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "modelo não encontrado neste escritório" };
  }

  await prisma.modeloPeticao.delete({ where: { id: modelo.id } });

  revalidatePath("/modelos");
  return { sucesso: true };
}

const preencherModeloParaPrazoSchema = z.object({
  prazoId: z.string().min(1),
  modeloId: z.string().min(1),
});

export type ResultadoPreenchimento = { sucesso: true; conteudo: string } | { sucesso: false; erro: string };

/**
 * Preenche um modelo com os dados do prazo — puro texto/substituição, sem
 * IA. Complementa (não substitui) o "Gerar rascunho com IA": quem já tem um
 * modelo pronto do escritório prefere isso, mais rápido e 100% previsível.
 */
export async function preencherModeloParaPrazo(input: unknown): Promise<ResultadoPreenchimento> {
  const parsed = preencherModeloParaPrazoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();

  const [prazo, modelo, escritorio] = await Promise.all([
    prisma.prazo.findUnique({ where: { id: parsed.data.prazoId }, include: { processo: true } }),
    prisma.modeloPeticao.findUnique({ where: { id: parsed.data.modeloId } }),
    prisma.escritorio.findUnique({ where: { id: usuario.escritorioId } }),
  ]);

  if (!prazo || prazo.processo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "prazo não encontrado neste escritório" };
  }
  if (!modelo || modelo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "modelo não encontrado neste escritório" };
  }
  if (!escritorio) {
    return { sucesso: false, erro: "escritório não encontrado" };
  }

  const conteudo = preencherModelo(modelo.conteudo, {
    cliente: prazo.processo.cliente,
    numeroCnj: prazo.processo.numeroCnj,
    varaOrgao: prazo.processo.varaOrgao,
    tribunal: prazo.processo.tribunal,
    uf: prazo.processo.uf,
    tipoAto: prazo.tipoAto,
    descricao: prazo.descricao,
    dataFatal: prazo.dataFatal,
    parteRepresentada: prazo.processo.parteRepresentada,
    escritorio: escritorio.nome,
    oab: escritorio.oab,
  });

  return { sucesso: true, conteudo };
}
