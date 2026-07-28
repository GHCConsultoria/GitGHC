"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { gerarTexto, IaNaoConfiguradaError } from "./anthropic";
import { montarPromptRascunho } from "./peticoes";

export type ResultadoRascunho = { sucesso: true; conteudo: string } | { sucesso: false; erro: string };

const gerarRascunhoSchema = z.object({ prazoId: z.string().min(1) });

/**
 * Gera um rascunho de petição via IA a partir de um prazo CONFIRMADO do
 * escritório de quem está logado. O rascunho é sempre gravado (histórico,
 * nunca sobrescreve) e devolvido pra tela — nunca enviado, protocolado ou
 * marcado como "pronto" automaticamente; quem usa isto revisa antes.
 */
export async function gerarRascunhoPeticao(input: unknown): Promise<ResultadoRascunho> {
  const parsed = gerarRascunhoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const prazo = await prisma.prazo.findUnique({
    where: { id: parsed.data.prazoId },
    include: { processo: true, publicacao: true },
  });

  if (!prazo || prazo.processo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "prazo não encontrado neste escritório" };
  }
  if (prazo.status !== "CONFIRMADO") {
    return { sucesso: false, erro: "só é possível gerar rascunho para um prazo confirmado" };
  }

  const prompt = montarPromptRascunho({
    cliente: prazo.processo.cliente,
    numeroCnj: prazo.processo.numeroCnj,
    varaOrgao: prazo.processo.varaOrgao,
    tribunal: prazo.processo.tribunal,
    uf: prazo.processo.uf,
    tipoAto: prazo.tipoAto,
    descricao: prazo.descricao,
    parteRepresentada: prazo.processo.parteRepresentada,
    textoPublicacao: prazo.publicacao.conteudo,
  });

  const modelo = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  let conteudo: string;
  try {
    conteudo = await gerarTexto({ prompt });
  } catch (erro) {
    if (erro instanceof IaNaoConfiguradaError) {
      return { sucesso: false, erro: erro.message };
    }
    return { sucesso: false, erro: erro instanceof Error ? erro.message : "falha ao gerar rascunho" };
  }

  await prisma.rascunhoPeticao.create({
    data: { prazoId: prazo.id, conteudo, modelo, criadoPorId: usuario.id },
  });

  revalidatePath("/");
  return { sucesso: true, conteudo };
}
