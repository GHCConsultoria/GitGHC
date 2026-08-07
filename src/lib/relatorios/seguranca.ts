import { prisma } from "@/lib/prisma";
import { paraDataCalendarioSaoPaulo } from "@/lib/prazos/calculo";

export interface ItemPerdido {
  id: string;
  publicacaoId: string;
  cliente: string;
  numeroCnj: string;
  tipoAto: string;
  dataFatal: Date;
}

export interface RelatorioSeguranca {
  periodoInicio: Date;
  periodoFim: Date;
  totalPrazos: number;
  confirmados: number;
  cumpridos: number;
  pendentesDentroDoPrazo: number;
  perdidos: number;
  descartados: number;
  itensPerdidos: ItemPerdido[];
  auditoriaCompleta: boolean;
}

/**
 * Relatório de segurança: para um período (por dataFatal), conta quantos
 * prazos foram confirmados/cumpridos com auditoria completa e quantos
 * "perdidos" — definição operacional: PENDENTE_CONFIRMACAO com dataFatal já
 * no passado, ou seja, um vencimento que passou sem que ninguém tivesse
 * confirmado nada. É a alegação central do relatório: "nenhum prazo
 * perdido" só é verdade se este número for zero — nunca inventado, sempre
 * recontado a partir do banco.
 */
export async function gerarRelatorioSeguranca(
  escritorioId: string,
  periodoInicio: Date,
  periodoFim: Date,
): Promise<RelatorioSeguranca> {
  const hoje = paraDataCalendarioSaoPaulo(new Date());

  const prazos = await prisma.prazo.findMany({
    where: {
      processo: { escritorioId },
      dataFatal: { gte: periodoInicio, lte: periodoFim },
    },
    include: { processo: true },
    orderBy: { dataFatal: "asc" },
  });

  let confirmados = 0;
  let cumpridos = 0;
  let pendentesDentroDoPrazo = 0;
  let descartados = 0;
  let confirmadosComAuditoria = 0;
  const itensPerdidos: ItemPerdido[] = [];

  for (const prazo of prazos) {
    if (prazo.status === "CUMPRIDO") {
      cumpridos += 1;
      confirmados += 1;
    } else if (prazo.status === "CONFIRMADO") {
      confirmados += 1;
    } else if (prazo.status === "DESCARTADO") {
      descartados += 1;
    } else if (prazo.status === "PENDENTE_CONFIRMACAO") {
      if (prazo.dataFatal.getTime() < hoje.getTime()) {
        itensPerdidos.push({
          id: prazo.id,
          publicacaoId: prazo.publicacaoId,
          cliente: prazo.processo.cliente,
          numeroCnj: prazo.processo.numeroCnj,
          tipoAto: prazo.tipoAto,
          dataFatal: prazo.dataFatal,
        });
      } else {
        pendentesDentroDoPrazo += 1;
      }
    }

    if ((prazo.status === "CONFIRMADO" || prazo.status === "CUMPRIDO") && prazo.confirmadoPorId && prazo.confirmadoEm) {
      confirmadosComAuditoria += 1;
    }
  }

  return {
    periodoInicio,
    periodoFim,
    totalPrazos: prazos.length,
    confirmados,
    cumpridos,
    pendentesDentroDoPrazo,
    perdidos: itensPerdidos.length,
    descartados,
    itensPerdidos,
    auditoriaCompleta: confirmadosComAuditoria === confirmados,
  };
}
