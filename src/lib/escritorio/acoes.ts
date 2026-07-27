"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";
import { UFS_BRASIL } from "@/lib/br/ufs";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

const atualizarEscritorioSchema = z.object({
  nome: z.string().trim().min(1, "informe o nome do escritório"),
  oab: z.string().trim().min(1, "informe a OAB"),
  uf: z.enum(UFS_BRASIL),
});

/**
 * Atualiza nome/OAB/UF do escritório de quem está logado. A OAB é o que a
 * ingestão do DJEN usa pra consultar publicações — só os dígitos importam
 * pra query (ver src/app/page.tsx), o resto do texto é só exibição.
 */
export async function atualizarEscritorio(input: unknown): Promise<ResultadoAcao> {
  const parsed = atualizarEscritorioSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }

  const usuario = await obterUsuarioAtual();

  await prisma.escritorio.update({
    where: { id: usuario.escritorioId },
    data: { nome: parsed.data.nome, oab: parsed.data.oab, uf: parsed.data.uf },
  });

  revalidatePath("/escritorio");
  revalidatePath("/");
  return { sucesso: true };
}
