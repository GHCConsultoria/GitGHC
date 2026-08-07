import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paraDataCalendarioSaoPaulo } from "./calculo";

const prazoComRelacoesArgs = Prisma.validator<Prisma.PrazoDefaultArgs>()({
  include: {
    processo: true,
    publicacao: true,
    responsavel: true,
    tarefas: { orderBy: { criadoEm: "asc" } },
  },
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

const prazoConfirmadoComRascunhoArgs = Prisma.validator<Prisma.PrazoDefaultArgs>()({
  include: {
    processo: true,
    publicacao: true,
    responsavel: true,
    tarefas: { orderBy: { criadoEm: "asc" } },
    rascunhosPeticao: { orderBy: { criadoEm: "desc" }, take: 1 },
  },
});
export type PrazoConfirmadoComRascunho = Prisma.PrazoGetPayload<typeof prazoConfirmadoComRascunhoArgs>;

/** Prazos já confirmados mais recentemente — é onde faz sentido oferecer "gerar rascunho de petição com IA". */
export async function buscarPrazosConfirmadosRecentes(escritorioId: string): Promise<PrazoConfirmadoComRascunho[]> {
  return prisma.prazo.findMany({
    where: { status: "CONFIRMADO", processo: { escritorioId } },
    ...prazoConfirmadoComRascunhoArgs,
    orderBy: { confirmadoEm: "desc" },
    take: 20,
  });
}

/**
 * Publicações vinculadas a um processo, mas que a classificação automática
 * por palavra-chave (src/lib/prazos/classificacao.ts) não conseguiu
 * resolver — candidatas à sugestão de tipo de ato por IA
 * (src/lib/ia/sugestao-tipo-ato.ts).
 */
export async function buscarPublicacoesVinculadasSemPrazo(escritorioId: string) {
  return prisma.publicacao.findMany({
    where: { status: "VINCULADA", processo: { escritorioId }, prazos: { none: {} } },
    include: { processo: true },
    orderBy: { dataDisponibilizacao: "desc" },
  });
}
export type PublicacaoVinculadaSemPrazo = Awaited<ReturnType<typeof buscarPublicacoesVinculadasSemPrazo>>[number];

const publicacaoDetalhadaArgs = Prisma.validator<Prisma.PublicacaoDefaultArgs>()({
  include: {
    processo: true,
    prazos: { include: { responsavel: true, confirmadoPor: true, tarefas: { orderBy: { criadoEm: "asc" } } } },
  },
});
export type PublicacaoDetalhada = Prisma.PublicacaoGetPayload<typeof publicacaoDetalhadaArgs>;

/** Publicação com processo, prazo(s) gerados e responsável — para a "central da publicação" (ver /publicacoes/[id]). */
export async function buscarPublicacaoDetalhada(publicacaoId: string): Promise<PublicacaoDetalhada | null> {
  return prisma.publicacao.findUnique({ where: { id: publicacaoId }, ...publicacaoDetalhadaArgs });
}

export interface EntradaHistorico {
  id: string;
  acao: string;
  entidade: string;
  usuarioNome: string;
  criadoEm: Date;
  valorAnterior: unknown;
  valorNovo: unknown;
}

/** Histórico de auditoria de uma publicação e de qualquer prazo gerado a partir dela, mais recente primeiro. */
export async function buscarHistoricoPublicacao(publicacaoId: string, prazoIds: string[]): Promise<EntradaHistorico[]> {
  const logs = await prisma.logAuditoria.findMany({
    where: {
      OR: [
        { entidade: "Publicacao", entidadeId: publicacaoId },
        ...(prazoIds.length > 0 ? [{ entidade: "Prazo", entidadeId: { in: prazoIds } }] : []),
      ],
    },
    include: { usuario: true },
    orderBy: { criadoEm: "desc" },
  });

  return logs.map((log) => ({
    id: log.id,
    acao: log.acao,
    entidade: log.entidade,
    usuarioNome: log.usuario.nome,
    criadoEm: log.criadoEm,
    valorAnterior: log.valorAnterior,
    valorNovo: log.valorNovo,
  }));
}

/** Lista enxuta de processos do escritório, para o seletor de vínculo manual. */
export async function buscarProcessosParaVinculacao(escritorioId: string) {
  return prisma.processo.findMany({
    where: { escritorioId },
    select: { id: true, numeroCnj: true, cliente: true, varaOrgao: true },
    orderBy: { cliente: "asc" },
  });
}
