import type { Prazo, Processo, Publicacao } from "@prisma/client";
import { calcularPrazoParaProcesso } from "./motor";

export type ResultadoVerificacaoPrazo =
  | { status: "CONFERIDO" }
  | { status: "DIVERGENTE"; motivo: string; dataFatalRecalculada: Date }
  | { status: "NAO_CONFERIVEL"; motivo: string };

/**
 * "Dupla checagem" leve: em vez de manter um segundo motor de cálculo em
 * paralelo (dobraria a complexidade do núcleo pra manter dois sincronizados),
 * reexecuta o MESMO motor determinístico (Fase 3) com os dados originais do
 * prazo e compara o resultado com o que foi salvo. Se o calendário de
 * feriados foi corrigido, ou a configuração de dias do tipo de ato mudou,
 * depois que este prazo foi calculado mas antes de ser confirmado, isso
 * aparece aqui como divergência — é exatamente a janela em que um prazo
 * poderia passar batido com um valor desatualizado.
 */
export async function verificarPrazo(
  prazo: Pick<Prazo, "tipoAto" | "dataFatal" | "diasPrazo">,
  publicacao: Pick<Publicacao, "dataDisponibilizacao">,
  processo: Pick<Processo, "uf" | "tribunal" | "prazoEmDobro">,
): Promise<ResultadoVerificacaoPrazo> {
  const resultado = await calcularPrazoParaProcesso({
    tipoAto: prazo.tipoAto,
    dataDisponibilizacao: publicacao.dataDisponibilizacao,
    uf: processo.uf,
    tribunal: processo.tribunal,
    prazoEmDobro: processo.prazoEmDobro,
  });

  if (resultado.status === "REVISAO_MANUAL") {
    return {
      status: "NAO_CONFERIVEL",
      motivo: `recalculo nao foi possivel: ${resultado.motivo}`,
    };
  }

  const dataFatalOriginal = new Date(prazo.dataFatal).getTime();
  const dataFatalNova = resultado.dataFatal.getTime();

  if (dataFatalNova !== dataFatalOriginal || resultado.diasPrazo !== prazo.diasPrazo) {
    return {
      status: "DIVERGENTE",
      motivo:
        resultado.diasPrazo !== prazo.diasPrazo
          ? `dias de prazo mudaram na configuracao (era ${prazo.diasPrazo}, agora ${resultado.diasPrazo})`
          : "calendario de feriados/revisoes mudou desde que este prazo foi calculado",
      dataFatalRecalculada: resultado.dataFatal,
    };
  }

  return { status: "CONFERIDO" };
}
