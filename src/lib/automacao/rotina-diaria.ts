import { prisma } from "@/lib/prisma";
import { DjenProvider } from "@/lib/publicacoes/djen-provider";
import { ingerirPublicacoes } from "@/lib/publicacoes/ingestao";
import { calcularPrazosParaPublicacoesVinculadas } from "@/lib/prazos/pipeline";
import { paraDataCalendarioSaoPaulo } from "@/lib/prazos/calculo";
import { enviarAlertasDeVencimentoProximo, enviarAlertasNovosPendentes } from "@/lib/alertas/alertas";

function formatarDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDiasCorridos(data: Date, quantidade: number): Date {
  const resultado = new Date(data.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

// Janela de segurança para a ingestão: sempre reprocessa os últimos dias,
// mesmo que o cron já tenha rodado hoje — idempotente pelo hashConteudo
// (Fase 2), então reprocessar não duplica nada. Cobre execuções que falharam
// ou foram puladas sem precisar guardar "quando foi a última corrida OK".
const JANELA_DE_SEGURANCA_DIAS = 4;

export interface ResultadoRotinaDiaria {
  execucaoId: string;
  publicacoesEncontradas: number;
  publicacoesNovas: number;
  publicacoesNaoIdentificadas: number;
  prazosCriados: number;
  prazosParaRevisaoManual: number;
  emailsEnviados: number;
  sucesso: boolean;
  erro?: string;
}

/**
 * Roda a ingestão (Fase 2) para todos os escritórios, calcula prazo para as
 * publicações recém-vinculadas (Fase 3, via pipeline de classificação),
 * dispara os alertas (novos pendentes + D-5/D-2/D-1) e grava o resultado em
 * ExecucaoCron — é o que alimenta o painel de saúde. Uma falha em qualquer
 * etapa é capturada e registrada como execução malsucedida, nunca deixada
 * silenciosa.
 */
export async function executarRotinaDiaria(): Promise<ResultadoRotinaDiaria> {
  let publicacoesEncontradas = 0;
  let publicacoesNovas = 0;
  let publicacoesNaoIdentificadas = 0;

  try {
    const escritorios = await prisma.escritorio.findMany();
    const hoje = paraDataCalendarioSaoPaulo(new Date());
    const dataInicio = formatarDataIso(somarDiasCorridos(hoje, -JANELA_DE_SEGURANCA_DIAS));
    const dataFim = formatarDataIso(hoje);

    for (const escritorio of escritorios) {
      const resultadoIngestao = await ingerirPublicacoes(
        {
          escritorioId: escritorio.id,
          oab: escritorio.oab.replace(/\D/g, ""),
          uf: escritorio.uf,
          dataInicio,
          dataFim,
        },
        new DjenProvider(),
      );
      publicacoesEncontradas += resultadoIngestao.encontradas;
      publicacoesNovas += resultadoIngestao.novas;
      publicacoesNaoIdentificadas += resultadoIngestao.naoIdentificadas;
    }

    const resultadoPipeline = await calcularPrazosParaPublicacoesVinculadas();
    const emailsNovosPendentes = await enviarAlertasNovosPendentes(resultadoPipeline.prazosCriadosIds);
    const emailsVencimento = await enviarAlertasDeVencimentoProximo();

    const execucao = await prisma.execucaoCron.create({
      data: {
        publicacoesEncontradas,
        publicacoesNovas,
        publicacoesNaoIdentificadas,
        prazosCriados: resultadoPipeline.prazosCriadosIds.length,
        prazosParaRevisaoManual: resultadoPipeline.paraRevisaoManual,
        sucesso: true,
      },
    });

    return {
      execucaoId: execucao.id,
      publicacoesEncontradas,
      publicacoesNovas,
      publicacoesNaoIdentificadas,
      prazosCriados: resultadoPipeline.prazosCriadosIds.length,
      prazosParaRevisaoManual: resultadoPipeline.paraRevisaoManual,
      emailsEnviados: emailsNovosPendentes + emailsVencimento,
      sucesso: true,
    };
  } catch (erroCapturado) {
    const mensagemErro = erroCapturado instanceof Error ? erroCapturado.message : String(erroCapturado);
    const execucao = await prisma.execucaoCron.create({
      data: {
        publicacoesEncontradas,
        publicacoesNovas,
        publicacoesNaoIdentificadas,
        prazosCriados: 0,
        prazosParaRevisaoManual: 0,
        sucesso: false,
        erro: mensagemErro,
      },
    });
    return {
      execucaoId: execucao.id,
      publicacoesEncontradas,
      publicacoesNovas,
      publicacoesNaoIdentificadas,
      prazosCriados: 0,
      prazosParaRevisaoManual: 0,
      emailsEnviados: 0,
      sucesso: false,
      erro: mensagemErro,
    };
  }
}
