import { prisma } from "@/lib/prisma";
import { calcularPrazo, type PassoCalculoPrazo } from "./calculo";

export interface CalcularPrazoParaProcessoParams {
  tipoAto: string;
  dataDisponibilizacao: Date;
  uf: string;
  tribunal: string;
  prazoEmDobro: boolean;
}

export type AlertaMotorPrazo = "TIPO_ATO_NAO_MAPEADO" | "FERIADOS_NAO_REVISADOS" | "CALCULO_INVALIDO";

export type ResultadoMotorPrazo =
  | {
      status: "CALCULADO";
      dataInicioContagem: Date;
      dataFatal: Date;
      diasPrazo: number;
      passos: PassoCalculoPrazo[];
    }
  | { status: "REVISAO_MANUAL"; motivo: string; alerta: AlertaMotorPrazo };

// Janela de anos buscada para os feriados: generosa o bastante para cobrir
// qualquer prazo realista deste MVP. A checagem no fim da função garante que,
// se o resultado ainda assim escapar da janela, o motor manda para revisão
// manual em vez de arriscar um cálculo com calendário incompleto.
const ANOS_DE_JANELA = 3;

/**
 * Orquestra o cálculo de um prazo para um Processo: resolve tipoAto ->
 * diasPrazo pela tabela configurável, aplica prazoEmDobro, exige que o
 * calendário de feriados da UF esteja revisado para todos os anos
 * envolvidos, e só então chama o motor puro (`calcularPrazo`). Qualquer
 * lacuna de dado vira revisão manual com o motivo — nunca um chute.
 */
export async function calcularPrazoParaProcesso(
  params: CalcularPrazoParaProcessoParams,
): Promise<ResultadoMotorPrazo> {
  const configuracaoAto = await prisma.tipoAtoPrazo.findUnique({ where: { tipoAto: params.tipoAto } });
  if (!configuracaoAto) {
    return {
      status: "REVISAO_MANUAL",
      motivo: `tipo de ato "${params.tipoAto}" nao esta mapeado em TipoAtoPrazo`,
      alerta: "TIPO_ATO_NAO_MAPEADO",
    };
  }

  const diasPrazo = params.prazoEmDobro ? configuracaoAto.diasPrazo * 2 : configuracaoAto.diasPrazo;

  // dataDisponibilizacao já é um dia-calendário (convenção deste projeto —
  // ver comentário em calculo.ts sobre paraDataCalendario vs.
  // paraDataCalendarioSaoPaulo), então o ano é lido direto em UTC.
  const anoBase = params.dataDisponibilizacao.getUTCFullYear();
  const anos = Array.from({ length: ANOS_DE_JANELA }, (_, indice) => anoBase + indice);

  const revisoes = await prisma.revisaoFeriadosUf.findMany({
    where: { uf: params.uf, ano: { in: anos } },
  });
  const revisadoPorAno = new Map(revisoes.map((revisao) => [revisao.ano, revisao.revisado]));
  const anoNaoRevisado = anos.find((ano) => revisadoPorAno.get(ano) !== true);
  if (anoNaoRevisado !== undefined) {
    return {
      status: "REVISAO_MANUAL",
      motivo: `calendario de feriados forenses de ${params.uf}/${anoNaoRevisado} ainda nao foi revisado`,
      alerta: "FERIADOS_NAO_REVISADOS",
    };
  }

  const feriados = await prisma.feriadoForense.findMany({
    where: {
      uf: params.uf,
      OR: [{ tribunal: null }, { tribunal: params.tribunal }],
      data: {
        gte: new Date(Date.UTC(anos[0], 0, 1)),
        lte: new Date(Date.UTC(anos[anos.length - 1], 11, 31)),
      },
    },
    select: { data: true },
  });

  const resultado = calcularPrazo({
    dataDisponibilizacao: params.dataDisponibilizacao,
    diasPrazo,
    contagemDiasUteis: configuracaoAto.contagemDiasUteis,
    uf: params.uf,
    tribunal: params.tribunal,
    feriados: feriados.map((feriado) => feriado.data),
  });

  if (!resultado.sucesso) {
    return { status: "REVISAO_MANUAL", motivo: resultado.motivo, alerta: "CALCULO_INVALIDO" };
  }

  // Segurança extra: se a data fatal calculada caiu fora da janela de anos
  // cujos feriados foram buscados, não há garantia de que os feriados
  // daquele ano foram considerados — mesmo que ele apareça como "revisado",
  // ele nunca chegou a ser buscado nesta chamada.
  if (resultado.dataFatal.getUTCFullYear() > anos[anos.length - 1]) {
    return {
      status: "REVISAO_MANUAL",
      motivo: `data fatal calculada (${resultado.dataFatal.toISOString().slice(0, 10)}) cai fora da janela de feriados verificada (ate ${anos[anos.length - 1]})`,
      alerta: "FERIADOS_NAO_REVISADOS",
    };
  }

  return {
    status: "CALCULADO",
    dataInicioContagem: resultado.dataInicioContagem,
    dataFatal: resultado.dataFatal,
    diasPrazo,
    passos: resultado.passos,
  };
}
