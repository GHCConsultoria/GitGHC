/**
 * Alertas de vencimento de contrato — função pura, testável sem I/O. As faixas
 * de alerta (30/15/7/1 dias) são configuráveis por parâmetro; o default segue
 * o pedido do produto. Datas comparadas por dia-calendário em
 * America/Sao_Paulo, para não errar por causa do horário/fuso do servidor.
 */

export const FAIXAS_ALERTA_PADRAO = [30, 15, 7, 1] as const;

const FUSO = "America/Sao_Paulo";

/** Converte um instante para o número de dias desde a época, no fuso de SP. */
function diaCalendario(data: Date): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // "YYYY-MM-DD" → dias desde 1970-01-01 (UTC midnight do dia local)
  const [ano, mes, dia] = fmt.format(data).split("-").map(Number);
  return Math.floor(Date.UTC(ano, mes - 1, dia) / 86_400_000);
}

export interface AlertaVencimento {
  diasRestantes: number; // negativo = já venceu
  vencido: boolean;
  // menor faixa de alerta que o contrato atingiu (ex.: 7), ou null se ainda
  // fora de qualquer faixa
  faixa: number | null;
  emAlerta: boolean;
}

/**
 * Calcula o alerta para uma data de vencimento. `faixas` deve estar em ordem
 * decrescente; a faixa retornada é a mais próxima já atingida (a menor cujo
 * limite >= diasRestantes), o que dá a urgência correta.
 */
export function calcularAlertaVencimento(
  dataFim: Date,
  hoje: Date = new Date(),
  faixas: readonly number[] = FAIXAS_ALERTA_PADRAO,
): AlertaVencimento {
  const diasRestantes = diaCalendario(dataFim) - diaCalendario(hoje);
  const vencido = diasRestantes < 0;

  if (vencido) {
    return { diasRestantes, vencido: true, faixa: 0, emAlerta: true };
  }

  const ordenadas = [...faixas].sort((a, b) => a - b); // crescente
  let faixa: number | null = null;
  for (const limite of ordenadas) {
    if (diasRestantes <= limite) {
      faixa = limite;
      break;
    }
  }

  return { diasRestantes, vencido: false, faixa, emAlerta: faixa !== null };
}
