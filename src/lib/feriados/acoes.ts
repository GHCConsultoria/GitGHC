"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, TipoFeriado } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { UFS_BRASIL } from "@/lib/br/ufs";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

const adicionarFeriadoSchema = z.object({
  uf: z.enum(UFS_BRASIL),
  // vazio = feriado estadual, vale para todos os tribunais da UF
  tribunal: z.string().trim().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use o formato AAAA-MM-DD"),
  descricao: z.string().trim().min(1, "informe a descrição"),
  tipo: z.nativeEnum(TipoFeriado),
});

/**
 * Cadastro manual de feriado estadual/de tribunal — a Fase 1 deixou isso
 * como TODO porque não dá pra inferir. Duplicata é checada manualmente
 * (findFirst) porque a unique constraint (uf, tribunal, data) não pega
 * duas linhas com tribunal NULL como iguais no Postgres.
 */
export async function adicionarFeriado(input: unknown): Promise<ResultadoAcao> {
  const parsed = adicionarFeriadoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();
  const tribunal = parsed.data.tribunal && parsed.data.tribunal.length > 0 ? parsed.data.tribunal : null;
  const data = new Date(`${parsed.data.data}T00:00:00Z`);

  const jaExiste = await prisma.feriadoForense.findFirst({
    where: { uf: parsed.data.uf, tribunal, data },
  });
  if (jaExiste) {
    return { sucesso: false, erro: "já existe um feriado cadastrado para esta UF/tribunal/data" };
  }

  const feriado = await prisma.feriadoForense.create({
    data: {
      uf: parsed.data.uf,
      tribunal,
      data,
      descricao: parsed.data.descricao,
      tipo: parsed.data.tipo,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "FeriadoForense",
      entidadeId: feriado.id,
      acao: "CRIAR",
      valorAnterior: Prisma.JsonNull,
      valorNovo: {
        uf: feriado.uf,
        tribunal: feriado.tribunal,
        data: feriado.data.toISOString().slice(0, 10),
        tipo: feriado.tipo,
      },
    },
  });

  revalidatePath("/feriados");
  return { sucesso: true };
}

const marcarRevisaoSchema = z.object({
  uf: z.enum(UFS_BRASIL),
  ano: z.number().int().min(2000).max(2100),
  revisado: z.boolean(),
});

/**
 * Marca (ou desmarca) uma UF/ano como revisado — é a decisão humana que
 * destrava o motor de prazo (Fase 3) a calcular automaticamente para essa
 * UF/ano em vez de mandar tudo para revisão manual.
 */
export async function marcarRevisao(input: unknown): Promise<ResultadoAcao> {
  const parsed = marcarRevisaoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();

  const anterior = await prisma.revisaoFeriadosUf.findUnique({
    where: { uf_ano: { uf: parsed.data.uf, ano: parsed.data.ano } },
  });

  const revisao = await prisma.revisaoFeriadosUf.upsert({
    where: { uf_ano: { uf: parsed.data.uf, ano: parsed.data.ano } },
    update: { revisado: parsed.data.revisado },
    create: { uf: parsed.data.uf, ano: parsed.data.ano, revisado: parsed.data.revisado },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "RevisaoFeriadosUf",
      entidadeId: revisao.id,
      acao: parsed.data.revisado ? "MARCAR_REVISADO" : "DESMARCAR_REVISADO",
      valorAnterior: { revisado: anterior?.revisado ?? false },
      valorNovo: { revisado: revisao.revisado },
    },
  });

  revalidatePath("/feriados");
  return { sucesso: true };
}
