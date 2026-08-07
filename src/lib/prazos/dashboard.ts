import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paraDataCalendarioSaoPaulo } from "./calculo";

const prazoDashboardArgs = Prisma.validator<Prisma.PrazoDefaultArgs>()({
  include: { processo: true, responsavel: true },
});
export type PrazoDashboard = Prisma.PrazoGetPayload<typeof prazoDashboardArgs>;

export type BucketDashboard = "HOJE" | "PROXIMOS_3_DIAS" | "PROXIMOS_7_DIAS";

export interface ItemDashboardPrazo {
  prazo: PrazoDashboard;
  bucket: BucketDashboard;
  diasCorridosRestantes: number;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function classificarBucket(diasCorridosRestantes: number): BucketDashboard | null {
  // <= 0 inclui vencidos — nunca some da vista, fica agrupado em "hoje".
  if (diasCorridosRestantes <= 0) return "HOJE";
  if (diasCorridosRestantes <= 3) return "PROXIMOS_3_DIAS";
  if (diasCorridosRestantes <= 7) return "PROXIMOS_7_DIAS";
  return null;
}

/**
 * Prazos ativos (pendentes ou confirmados — nunca cumpridos/descartados) que
 * vencem nos próximos 7 dias corridos, agrupados em hoje/3 dias/7 dias — a
 * visão de controle imediato do dashboard. Dias corridos (não úteis) porque
 * é isso que o advogado sente como urgência de calendário; a contagem legal
 * de dias úteis já foi resolvida pelo motor (Fase 3) na dataFatal em si.
 */
export async function buscarPrazosParaDashboard(escritorioId: string): Promise<ItemDashboardPrazo[]> {
  const hoje = paraDataCalendarioSaoPaulo(new Date());
  const limite = new Date(hoje.getTime() + 7 * MS_POR_DIA);

  const prazos = await prisma.prazo.findMany({
    where: {
      processo: { escritorioId },
      status: { in: ["PENDENTE_CONFIRMACAO", "CONFIRMADO"] },
      dataFatal: { lte: limite },
    },
    ...prazoDashboardArgs,
    orderBy: { dataFatal: "asc" },
  });

  const itens: ItemDashboardPrazo[] = [];
  for (const prazo of prazos) {
    const diasCorridosRestantes = Math.round((prazo.dataFatal.getTime() - hoje.getTime()) / MS_POR_DIA);
    const bucket = classificarBucket(diasCorridosRestantes);
    if (bucket) itens.push({ prazo, bucket, diasCorridosRestantes });
  }
  return itens;
}
