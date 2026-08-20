/**
 * Fluxo de caixa — funções puras. Trabalha sobre lançamentos financeiros
 * (contas a receber/pagar) e produz entradas, saídas e saldo. Considera
 * apenas o que foi de fato PAGO (regime de caixa), usando a data de pagamento.
 * Tudo em centavos.
 */

export interface LancamentoFluxo {
  tipo: "RECEBER" | "PAGAR";
  status: "PENDENTE" | "PAGO" | "CANCELADO";
  valor: number; // centavos
  pagamentoEm: Date | null;
}

export interface ResumoFluxo {
  entradas: number; // centavos (recebimentos pagos)
  saidas: number; // centavos (pagamentos pagos)
  saldoInicial: number;
  saldoFinal: number;
  aReceber: number; // pendentes de receber
  aPagar: number; // pendentes de pagar
}

/** Consolida um conjunto de lançamentos num resumo de caixa. */
export function resumoFluxoCaixa(lancamentos: readonly LancamentoFluxo[], saldoInicial = 0): ResumoFluxo {
  let entradas = 0;
  let saidas = 0;
  let aReceber = 0;
  let aPagar = 0;

  for (const l of lancamentos) {
    if (l.status === "CANCELADO") continue;
    if (l.status === "PAGO") {
      if (l.tipo === "RECEBER") entradas += l.valor;
      else saidas += l.valor;
    } else {
      // PENDENTE
      if (l.tipo === "RECEBER") aReceber += l.valor;
      else aPagar += l.valor;
    }
  }

  return {
    entradas,
    saidas,
    saldoInicial,
    saldoFinal: saldoInicial + entradas - saidas,
    aReceber,
    aPagar,
  };
}

const FUSO = "America/Sao_Paulo";

/** Agrupa os recebimentos/pagamentos pagos por mês (YYYY-MM em SP). */
export function fluxoPorMes(
  lancamentos: readonly LancamentoFluxo[],
): Array<{ mes: string; entradas: number; saidas: number }> {
  const mapa = new Map<string, { entradas: number; saidas: number }>();
  for (const l of lancamentos) {
    if (l.status !== "PAGO" || !l.pagamentoEm) continue;
    const mes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit" })
      .format(l.pagamentoEm)
      .slice(0, 7);
    const atual = mapa.get(mes) ?? { entradas: 0, saidas: 0 };
    if (l.tipo === "RECEBER") atual.entradas += l.valor;
    else atual.saidas += l.valor;
    mapa.set(mes, atual);
  }
  return Array.from(mapa.entries())
    .map(([mes, v]) => ({ mes, ...v }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}
