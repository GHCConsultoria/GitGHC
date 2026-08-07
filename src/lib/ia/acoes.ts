"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { calcularPrazoParaProcesso } from "@/lib/prazos/motor";
import { gerarTexto, IaNaoConfiguradaError } from "./anthropic";
import { montarPromptRascunho } from "./peticoes";
import { sugerirTipoAto } from "./sugestao-tipo-ato";

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

const obterSugestaoSchema = z.object({ publicacaoId: z.string().min(1) });

export type ResultadoSugestaoTipoAto =
  | { sucesso: true; tipoAtoSugerido: string | null; justificativa: string }
  | { sucesso: false; erro: string };

/** Pede à IA uma sugestão de tipo de ato para uma publicação vinculada que a classificação por palavra-chave não resolveu — nunca cria nada sozinha. */
export async function obterSugestaoTipoAtoPublicacao(input: unknown): Promise<ResultadoSugestaoTipoAto> {
  const parsed = obterSugestaoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const publicacao = await prisma.publicacao.findUnique({
    where: { id: parsed.data.publicacaoId },
    include: { processo: true },
  });
  if (!publicacao || publicacao.processo?.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "publicação não encontrada neste escritório" };
  }

  const tiposDisponiveis = await prisma.tipoAtoPrazo.findMany();

  try {
    const sugestao = await sugerirTipoAto(publicacao.conteudo, tiposDisponiveis);
    return { sucesso: true, ...sugestao };
  } catch (erro) {
    if (erro instanceof IaNaoConfiguradaError) {
      return { sucesso: false, erro: erro.message };
    }
    return { sucesso: false, erro: erro instanceof Error ? erro.message : "falha ao obter sugestão" };
  }
}

const classificarComTipoAtoSchema = z.object({
  publicacaoId: z.string().min(1),
  tipoAto: z.string().min(1),
});

export type ResultadoClassificacao = { sucesso: true } | { sucesso: false; erro: string };

/**
 * Aplica um tipo de ato (vindo da sugestão da IA ou escolhido manualmente) a
 * uma publicação VINCULADA sem prazo, calcula o prazo pelo motor (Fase 3) e
 * cria o Prazo PENDENTE_CONFIRMACAO — mesmo caminho que o pipeline
 * automático usaria se a classificação por palavra-chave tivesse
 * funcionado. Se o motor mandar para revisão manual (tipo não mapeado,
 * feriados não revisados), nenhum Prazo é criado.
 */
export async function classificarPublicacaoComTipoAto(input: unknown): Promise<ResultadoClassificacao> {
  const parsed = classificarComTipoAtoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const publicacao = await prisma.publicacao.findUnique({
    where: { id: parsed.data.publicacaoId },
    include: { processo: true, prazos: true },
  });
  if (!publicacao || !publicacao.processo || publicacao.processo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "publicação não encontrada neste escritório" };
  }
  if (publicacao.status !== "VINCULADA") {
    return { sucesso: false, erro: "publicação precisa estar vinculada a um processo" };
  }
  if (publicacao.prazos.length > 0) {
    return { sucesso: false, erro: "esta publicação já tem um prazo calculado" };
  }

  const resultado = await calcularPrazoParaProcesso({
    tipoAto: parsed.data.tipoAto,
    dataDisponibilizacao: publicacao.dataDisponibilizacao,
    uf: publicacao.processo.uf,
    tribunal: publicacao.processo.tribunal,
    prazoEmDobro: publicacao.processo.prazoEmDobro,
  });

  if (resultado.status === "REVISAO_MANUAL") {
    return { sucesso: false, erro: resultado.motivo };
  }

  const configuracaoAto = await prisma.tipoAtoPrazo.findUnique({ where: { tipoAto: parsed.data.tipoAto } });
  if (!configuracaoAto) {
    return { sucesso: false, erro: "tipo de ato não encontrado" };
  }

  const prazo = await prisma.prazo.create({
    data: {
      publicacaoId: publicacao.id,
      processoId: publicacao.processo.id,
      tipoAto: parsed.data.tipoAto,
      descricao: configuracaoAto.descricao ?? parsed.data.tipoAto,
      dataInicioContagem: resultado.dataInicioContagem,
      diasPrazo: resultado.diasPrazo,
      contagemDiasUteis: configuracaoAto.contagemDiasUteis,
      dataFatal: resultado.dataFatal,
      detalhesCalculo: resultado.passos as unknown as Prisma.InputJsonValue,
      status: "PENDENTE_CONFIRMACAO",
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "Publicacao",
      entidadeId: publicacao.id,
      acao: "CLASSIFICAR_COM_SUGESTAO_IA",
      valorNovo: { tipoAto: parsed.data.tipoAto, prazoId: prazo.id },
    },
  });

  revalidatePath("/");
  return { sucesso: true };
}
