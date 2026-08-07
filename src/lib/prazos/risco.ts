import { prisma } from "@/lib/prisma";
import { paraDataCalendarioSaoPaulo } from "./calculo";

export type TipoRisco = "NAO_CONFIRMADO" | "SEM_TAREFA" | "NAO_VISUALIZADO";

export interface FlagRisco {
  tipo: TipoRisco;
  mensagem: string;
}

export interface ItemRisco {
  prazoId: string;
  publicacaoId: string;
  cliente: string;
  numeroCnj: string;
  tipoAto: string;
  dataFatal: Date;
  flags: FlagRisco[];
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const JANELA_RISCO_DIAS = 3;

/**
 * "Modo paranoia jurídica": varre os prazos ativos dos próximos dias e
 * sinaliza tudo que deveria estar incomodando alguém — prazo perto e ainda
 * não confirmado, prazo perto sem nenhuma tarefa registrada, alerta de
 * WhatsApp que ninguém confirmou ter visto. Um prazo pode acumular mais de
 * um flag; só entra na lista quem tem pelo menos um.
 */
export async function calcularRiscos(escritorioId: string): Promise<ItemRisco[]> {
  const hoje = paraDataCalendarioSaoPaulo(new Date());
  const limite = new Date(hoje.getTime() + JANELA_RISCO_DIAS * MS_POR_DIA);

  const prazos = await prisma.prazo.findMany({
    where: {
      processo: { escritorioId },
      status: { in: ["PENDENTE_CONFIRMACAO", "CONFIRMADO"] },
      dataFatal: { lte: limite },
    },
    include: { processo: true, tarefas: true },
    orderBy: { dataFatal: "asc" },
  });

  const itens: ItemRisco[] = [];
  for (const prazo of prazos) {
    const diasRestantes = Math.round((prazo.dataFatal.getTime() - hoje.getTime()) / MS_POR_DIA);
    const flags: FlagRisco[] = [];

    if (prazo.status === "PENDENTE_CONFIRMACAO" && diasRestantes <= JANELA_RISCO_DIAS) {
      flags.push({
        tipo: "NAO_CONFIRMADO",
        mensagem:
          diasRestantes < 0
            ? "Este prazo já venceu e ainda não foi confirmado por ninguém."
            : "Este prazo ainda não foi confirmado por nenhum usuário.",
      });
    }

    if (diasRestantes <= JANELA_RISCO_DIAS && prazo.tarefas.length === 0) {
      flags.push({ tipo: "SEM_TAREFA", mensagem: "Prazo perto do vencimento sem nenhuma tarefa registrada." });
    }

    if (diasRestantes <= 1 && !prazo.visualizadoEm) {
      flags.push({ tipo: "NAO_VISUALIZADO", mensagem: "Ninguém confirmou ter visto o alerta deste prazo." });
    }

    if (flags.length > 0) {
      itens.push({
        prazoId: prazo.id,
        publicacaoId: prazo.publicacaoId,
        cliente: prazo.processo.cliente,
        numeroCnj: prazo.processo.numeroCnj,
        tipoAto: prazo.tipoAto,
        dataFatal: prazo.dataFatal,
        flags,
      });
    }
  }

  return itens;
}

export interface AlertaFeriadosNaoRevisados {
  uf: string;
  ano: number;
}

/**
 * "Esse prazo depende de feriado não revisado. Revisão obrigatória." — checa,
 * pras UFs onde o escritório tem processo, se o calendário de feriados do
 * ano corrente ou seguinte ainda não foi marcado como revisado. É a mesma
 * trava que o motor de cálculo (Fase 3) já aplica silenciosamente; aqui só
 * fica visível ANTES de virar um prazo perdido.
 */
export async function buscarAlertasFeriadosNaoRevisados(escritorioId: string): Promise<AlertaFeriadosNaoRevisados[]> {
  const anoAtual = paraDataCalendarioSaoPaulo(new Date()).getUTCFullYear();

  const processos = await prisma.processo.findMany({
    where: { escritorioId },
    distinct: ["uf"],
    select: { uf: true },
  });
  const ufs = processos.map((processo) => processo.uf);
  if (ufs.length === 0) return [];

  const revisoes = await prisma.revisaoFeriadosUf.findMany({
    where: { uf: { in: ufs }, ano: { in: [anoAtual, anoAtual + 1] }, revisado: false },
    orderBy: [{ uf: "asc" }, { ano: "asc" }],
  });

  return revisoes.map((revisao) => ({ uf: revisao.uf, ano: revisao.ano }));
}
