"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ParteRepresentada, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { normalizarNumeroCnj } from "@/lib/publicacoes/cnj";
import { UFS_BRASIL } from "@/lib/br/ufs";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

const criarProcessoSchema = z.object({
  numeroCnj: z.string().min(1, "informe o número do processo"),
  cliente: z.string().trim().min(1, "informe o cliente"),
  varaOrgao: z.string().trim().min(1, "informe a vara/órgão"),
  uf: z.enum(UFS_BRASIL),
  tribunal: z.string().trim().min(1, "informe o tribunal"),
  parteRepresentada: z.nativeEnum(ParteRepresentada),
  prazoEmDobro: z.boolean(),
});

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
    const processo = await prisma.processo.create({
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

    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "Processo",
        entidadeId: processo.id,
        acao: "CRIAR",
        valorAnterior: Prisma.JsonNull,
        valorNovo: { numeroCnj: processo.numeroCnj, cliente: processo.cliente },
      },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { sucesso: false, erro: "já existe um processo com este número CNJ neste escritório" };
    }
    throw erro;
  }

  revalidatePath("/processos");
  revalidatePath("/");
  return { sucesso: true };
}
