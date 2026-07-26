import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paraDataCalendarioSaoPaulo } from "./calculo";

const prazoComRelacoesArgs = Prisma.validator<Prisma.PrazoDefaultArgs>()({
  include: { processo: true, publicacao: true },
});
export type PrazoComRelacoes = Prisma.PrazoGetPayload<typeof prazoComRelacoesArgs>;

export type NivelUrgencia = "VERMELHO" | "AMARELO" | "VERDE";

export interface ItemFilaPrazo {
  prazo: PrazoComRelacoes;
  urgencia: NivelUrgencia;
  diasUteisRestantes: number;
}

/**
 * Conta dias úteis (seg-sex, sem feriados) entre `hoje` e `dataFatal`. É uma
 * aproximação para fins do indicador visual (semáforo) — a data fatal em si
 * já foi calculada considerando feriados/recesso pelo motor da Fase 3; isto
 * aqui só decide a cor, não recalcula o prazo. Negativo = prazo já vencido.
 */
export function contarDiasUteisAte(hoje: Date, dataFatal: Date): number {
  if (dataFatal.getTime() < hoje.getTime()) {
    return -contarDiasUteisAte(dataFatal, hoje);
  }
  let contagem = 0;
  const cursor = new Date(hoje.getTime());
  while (cursor.getTime() < dataFatal.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const diaDaSemana = cursor.getUTCDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) {
      contagem += 1;
    }
  }
  return contagem;
}

function classificarUrgencia(diasUteisRestantes: number): NivelUrgencia {
  if (diasUteisRestantes <= 2) return "VERMELHO";
  if (diasUteisRestantes <= 5) return "AMARELO";
  return "VERDE";
}

/** Fila principal: prazos aguardando confirmação humana, mais urgente primeiro. */
export async function buscarFilaPrazosPendentes(escritorioId: string): Promise<ItemFilaPrazo[]> {
  const prazos = await prisma.prazo.findMany({
    where: { status: "PENDENTE_CONFIRMACAO", processo: { escritorioId } },
    ...prazoComRelacoesArgs,
    orderBy: { dataFatal: "asc" },
  });

  const hoje = paraDataCalendarioSaoPaulo(new Date());

  return prazos.map((prazo) => {
    const diasUteisRestantes = contarDiasUteisAte(hoje, prazo.dataFatal);
    return { prazo, urgencia: classificarUrgencia(diasUteisRestantes), diasUteisRestantes };
  });
}

/** Fila de publicações que a ingestão não conseguiu vincular a nenhum processo. */
export async function buscarPublicacoesNaoIdentificadas() {
  return prisma.publicacao.findMany({
    where: { status: "NAO_IDENTIFICADA" },
    orderBy: { dataDisponibilizacao: "desc" },
  });
}

/** Lista enxuta de processos do escritório, para o seletor de vínculo manual. */
export async function buscarProcessosParaVinculacao(escritorioId: string) {
  return prisma.processo.findMany({
    where: { escritorioId },
    select: { id: true, numeroCnj: true, cliente: true, varaOrgao: true },
    orderBy: { cliente: "asc" },
  });
}
