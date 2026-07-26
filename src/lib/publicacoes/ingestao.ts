import crypto from "node:crypto";
import { Prisma, StatusPublicacao } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extrairNumerosCnj } from "./cnj";
import type { PublicacaoProvider } from "./provider";

export interface IngestaoParams {
  escritorioId: string;
  oab: string;
  uf: string;
  dataInicio: string;
  dataFim: string;
}

export interface IngestaoResultado {
  encontradas: number;
  novas: number;
  jaExistentes: number;
  vinculadas: number;
  naoIdentificadas: number;
  ignoradas: Array<{ identificadorExterno: string; motivo: string }>;
}

/** Chave de idempotência: hash do identificador da fonte + conteúdo bruto. */
function calcularHashConteudo(identificadorExterno: string, conteudo: string): string {
  return crypto.createHash("sha256").update(`${identificadorExterno}::${conteudo}`).digest("hex");
}

/**
 * Busca publicações na fonte para o período, persiste as novas (idempotente
 * por hashConteudo) e tenta vincular cada uma a um Processo existente do
 * escritório pelo número CNJ extraído do texto. Não calcula prazo — isso é
 * responsabilidade da Fase 3.
 */
export async function ingerirPublicacoes(
  params: IngestaoParams,
  provider: PublicacaoProvider,
): Promise<IngestaoResultado> {
  const brutas = await provider.buscarPublicacoes({
    oab: params.oab,
    uf: params.uf,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
  });

  const resultado: IngestaoResultado = {
    encontradas: brutas.length,
    novas: 0,
    jaExistentes: 0,
    vinculadas: 0,
    naoIdentificadas: 0,
    ignoradas: [],
  };

  const processos = await prisma.processo.findMany({
    where: { escritorioId: params.escritorioId },
    select: { id: true, numeroCnj: true },
  });
  const processoIdPorCnj = new Map(processos.map((processo) => [processo.numeroCnj, processo.id]));

  for (const bruta of brutas) {
    if (!bruta.conteudo || !bruta.dataDisponibilizacao) {
      resultado.ignoradas.push({
        identificadorExterno: bruta.identificadorExterno,
        motivo: "conteudo ou dataDisponibilizacao ausente na resposta da fonte",
      });
      continue;
    }

    const dataDisponibilizacao = new Date(bruta.dataDisponibilizacao);
    if (Number.isNaN(dataDisponibilizacao.getTime())) {
      resultado.ignoradas.push({
        identificadorExterno: bruta.identificadorExterno,
        motivo: "dataDisponibilizacao invalida",
      });
      continue;
    }

    const hashConteudo = calcularHashConteudo(bruta.identificadorExterno, bruta.conteudo);

    const existente = await prisma.publicacao.findUnique({ where: { hashConteudo } });
    if (existente) {
      resultado.jaExistentes += 1;
      continue;
    }

    const cnjsCandidatos = extrairNumerosCnj(bruta.conteudo);
    const processosEncontrados = new Set(
      cnjsCandidatos
        .map((cnj) => processoIdPorCnj.get(cnj))
        .filter((id): id is string => Boolean(id)),
    );
    // Mais de um Processo diferente casando com a mesma publicação é
    // ambíguo — melhor mandar para revisão manual do que vincular no chute.
    const processoId = processosEncontrados.size === 1 ? Array.from(processosEncontrados)[0] : null;

    try {
      await prisma.publicacao.create({
        data: {
          conteudo: bruta.conteudo,
          dataDisponibilizacao,
          dataPublicacao: bruta.dataPublicacao ? new Date(bruta.dataPublicacao) : null,
          fonte: bruta.fonte,
          hashConteudo,
          status: processoId ? StatusPublicacao.VINCULADA : StatusPublicacao.NAO_IDENTIFICADA,
          processoId,
          rawJson: bruta.rawJson as Prisma.InputJsonValue,
        },
      });
    } catch (erro) {
      // Corrida entre execuções concorrentes do mesmo período: outra
      // chamada já inseriu esta publicação entre o findUnique e o create.
      // Trata como já existente em vez de falhar a ingestão inteira.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        resultado.jaExistentes += 1;
        continue;
      }
      throw erro;
    }

    resultado.novas += 1;
    if (processoId) {
      resultado.vinculadas += 1;
    } else {
      resultado.naoIdentificadas += 1;
    }
  }

  return resultado;
}
