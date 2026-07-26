import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classificarTipoAto } from "./classificacao";
import { calcularPrazoParaProcesso } from "./motor";

export interface ResultadoPipelinePrazos {
  prazosCriadosIds: string[];
  paraRevisaoManual: number;
}

/**
 * Para cada Publicacao VINCULADA que ainda não tem Prazo, sugere o tipoAto
 * (classificação por palavra-chave, nunca IA) e, se houver sugestão, chama o
 * motor de cálculo. Cria o Prazo (PENDENTE_CONFIRMACAO) só quando o motor
 * calcula com sucesso — quando não há sugestão de tipoAto ou o motor manda
 * para revisão manual (tipo não mapeado, feriados não revisados), nenhum
 * Prazo é criado (o schema exige dataFatal, não dá pra representar "sem
 * data" numa linha de Prazo) e a publicação fica como está, para
 * classificação manual futura.
 */
export async function calcularPrazosParaPublicacoesVinculadas(): Promise<ResultadoPipelinePrazos> {
  const publicacoesSemPrazo = await prisma.publicacao.findMany({
    where: { status: "VINCULADA", prazos: { none: {} } },
    include: { processo: true },
  });

  const prazosCriadosIds: string[] = [];
  let paraRevisaoManual = 0;

  for (const publicacao of publicacoesSemPrazo) {
    if (!publicacao.processo) {
      // guarda de tipo: status VINCULADA sempre implica processoId presente
      continue;
    }
    const processo = publicacao.processo;

    const tipoAto = classificarTipoAto(publicacao.conteudo);
    if (!tipoAto) {
      paraRevisaoManual += 1;
      continue;
    }

    const resultado = await calcularPrazoParaProcesso({
      tipoAto,
      dataDisponibilizacao: publicacao.dataDisponibilizacao,
      uf: processo.uf,
      tribunal: processo.tribunal,
      prazoEmDobro: processo.prazoEmDobro,
    });

    if (resultado.status === "REVISAO_MANUAL") {
      paraRevisaoManual += 1;
      continue;
    }

    const configuracaoAto = await prisma.tipoAtoPrazo.findUnique({ where: { tipoAto } });
    if (!configuracaoAto) {
      // não deveria acontecer (o motor já teria mandado pra revisão manual),
      // mas não arrisca criar um Prazo com contagemDiasUteis chutado.
      paraRevisaoManual += 1;
      continue;
    }

    const prazo = await prisma.prazo.create({
      data: {
        publicacaoId: publicacao.id,
        processoId: processo.id,
        tipoAto,
        descricao: configuracaoAto.descricao ?? tipoAto,
        dataInicioContagem: resultado.dataInicioContagem,
        diasPrazo: resultado.diasPrazo,
        contagemDiasUteis: configuracaoAto.contagemDiasUteis,
        dataFatal: resultado.dataFatal,
        detalhesCalculo: resultado.passos as unknown as Prisma.InputJsonValue,
        status: "PENDENTE_CONFIRMACAO",
      },
    });
    prazosCriadosIds.push(prazo.id);
  }

  return { prazosCriadosIds, paraRevisaoManual };
}
