"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ParteRepresentada, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { normalizarNumeroCnj } from "@/lib/publicacoes/cnj";
import { UFS_BRASIL } from "@/lib/br/ufs";
import { parseCsvProcessos } from "@/lib/processos/importacao";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

const criarProcessoSchema = z.object({
  numeroCnj: z.string().min(1, "informe o número do processo"),
  cliente: z.string().trim().min(1, "informe o cliente"),
  varaOrgao: z.string().trim().min(1, "informe a vara/órgão"),
  uf: z.enum(UFS_BRASIL),
  tribunal: z.string().trim().min(1, "informe o tribunal"),
  parteRepresentada: z.nativeEnum(ParteRepresentada),
  prazoEmDobro: z.boolean(),
  // presente quando o cadastro nasce do fluxo "cadastrar a partir desta
  // publicação não identificada" — nesse caso vincula a publicação ao
  // processo recém-criado na mesma transação.
  publicacaoId: z.string().min(1).optional(),
});

class PublicacaoIndisponivelError extends Error {}

/**
 * Cadastro de processo pelo próprio escritório (não existia nenhuma via de
 * entrada além da seed) — escritorioId vem sempre da sessão, nunca do
 * cliente, para não deixar um usuário cadastrar processo em escritório
 * alheio.
 */
export async function criarProcesso(input: unknown): Promise<ResultadoAcao> {
  const parsed = criarProcessoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const numeroCnjNormalizado = normalizarNumeroCnj(parsed.data.numeroCnj);
  if (numeroCnjNormalizado.length !== 20) {
    return {
      sucesso: false,
      erro: "número CNJ inválido — deve ter 20 dígitos (ex.: 1234567-89.2025.8.26.0100)",
    };
  }

  const usuario = await obterUsuarioAtual();

  try {
    await prisma.$transaction(async (tx) => {
      const processo = await tx.processo.create({
        data: {
          escritorioId: usuario.escritorioId,
          numeroCnj: numeroCnjNormalizado,
          cliente: parsed.data.cliente,
          varaOrgao: parsed.data.varaOrgao,
          uf: parsed.data.uf,
          tribunal: parsed.data.tribunal,
          parteRepresentada: parsed.data.parteRepresentada,
          prazoEmDobro: parsed.data.prazoEmDobro,
        },
      });

      await tx.logAuditoria.create({
        data: {
          usuarioId: usuario.id,
          entidade: "Processo",
          entidadeId: processo.id,
          acao: "CRIAR",
          valorAnterior: Prisma.JsonNull,
          valorNovo: { numeroCnj: processo.numeroCnj, cliente: processo.cliente },
        },
      });

      if (parsed.data.publicacaoId) {
        const publicacao = await tx.publicacao.findUnique({ where: { id: parsed.data.publicacaoId } });
        if (!publicacao || publicacao.status !== "NAO_IDENTIFICADA") {
          throw new PublicacaoIndisponivelError();
        }

        await tx.publicacao.update({
          where: { id: publicacao.id },
          data: { status: "VINCULADA", processoId: processo.id },
        });

        await tx.logAuditoria.create({
          data: {
            usuarioId: usuario.id,
            entidade: "Publicacao",
            entidadeId: publicacao.id,
            acao: "VINCULAR_MANUAL",
            valorAnterior: { status: publicacao.status, processoId: publicacao.processoId },
            valorNovo: { status: "VINCULADA", processoId: processo.id },
          },
        });
      }
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { sucesso: false, erro: "já existe um processo com este número CNJ neste escritório" };
    }
    if (erro instanceof PublicacaoIndisponivelError) {
      return { sucesso: false, erro: "esta publicação já não está mais disponível para vínculo" };
    }
    throw erro;
  }

  revalidatePath("/processos");
  revalidatePath("/");
  return { sucesso: true };
}

const atribuirResponsavelSchema = z.object({
  processoId: z.string().min(1),
  responsavelId: z.string().min(1).nullable(),
});

/** Define/remove o responsável por um processo — aberto a qualquer papel (não é uma decisão de responsabilidade legal sobre um prazo, é só organização de quem cuida do quê). */
export async function atribuirResponsavelProcesso(input: unknown): Promise<ResultadoAcao> {
  const parsed = atribuirResponsavelSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const processo = await prisma.processo.findUnique({ where: { id: parsed.data.processoId } });
  if (!processo || processo.escritorioId !== usuario.escritorioId) {
    return { sucesso: false, erro: "processo não encontrado neste escritório" };
  }

  if (parsed.data.responsavelId) {
    const responsavel = await prisma.usuario.findUnique({ where: { id: parsed.data.responsavelId } });
    if (!responsavel || responsavel.escritorioId !== usuario.escritorioId) {
      return { sucesso: false, erro: "responsável inválido" };
    }
  }

  await prisma.processo.update({ where: { id: processo.id }, data: { responsavelId: parsed.data.responsavelId } });

  revalidatePath("/processos");
  return { sucesso: true };
}

export interface ResultadoLinhaImportacao {
  linha: number;
  status: "criado" | "duplicado" | "invalida";
  numeroCnj?: string;
  erro?: string;
}

export type ResultadoImportacaoCsv =
  | { sucesso: true; resultados: ResultadoLinhaImportacao[]; totalCriados: number }
  | { sucesso: false; erro: string };

/**
 * Importa processos em lote a partir de um CSV (ver template em
 * src/lib/processos/importacao.ts). Cada linha é tratada de forma
 * independente — uma linha inválida ou duplicada não aborta as demais,
 * porque o objetivo é migrar uma carteira inteira de processos de uma vez
 * só, e travar tudo por causa de uma linha ruim obrigaria reenviar o
 * arquivo inteiro. Duplicado (mesmo numeroCnj já cadastrado neste
 * escritório) não é erro — só é pulado.
 */
export async function importarProcessosCsv(csvText: string): Promise<ResultadoImportacaoCsv> {
  const usuario = await obterUsuarioAtual();

  const parseado = parseCsvProcessos(csvText);
  if (parseado.status === "cabecalho_invalido") {
    return { sucesso: false, erro: parseado.erro };
  }

  const resultados: ResultadoLinhaImportacao[] = [];
  let totalCriados = 0;

  for (const linha of parseado.linhas) {
    if (linha.status === "invalida") {
      resultados.push({ linha: linha.linha, status: "invalida", erro: linha.erro });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const processo = await tx.processo.create({
          data: { escritorioId: usuario.escritorioId, ...linha.dados },
        });
        await tx.logAuditoria.create({
          data: {
            usuarioId: usuario.id,
            entidade: "Processo",
            entidadeId: processo.id,
            acao: "IMPORTAR_CSV",
            valorAnterior: Prisma.JsonNull,
            valorNovo: { numeroCnj: processo.numeroCnj, cliente: processo.cliente },
          },
        });
      });
      resultados.push({ linha: linha.linha, status: "criado", numeroCnj: linha.dados.numeroCnj });
      totalCriados += 1;
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        resultados.push({ linha: linha.linha, status: "duplicado", numeroCnj: linha.dados.numeroCnj });
        continue;
      }
      throw erro;
    }
  }

  revalidatePath("/processos");
  revalidatePath("/");
  return { sucesso: true, resultados, totalCriados };
}
