const FUSO = "America/Sao_Paulo";

function partesEmFuso(data: Date) {
  const formatador = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const partes = formatador.formatToParts(data);
  const obter = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return { hora: obter("hour"), minuto: obter("minute"), segundo: obter("second") };
}

/**
 * Início/fim (exclusivo) do dia-calendário em America/Sao_Paulo que contém
 * `referencia`, como instantes UTC — para filtrar "registros de hoje" sem
 * depender do fuso do servidor. Não hardcoda o offset -03:00: calcula a
 * partir da hora local de verdade (via Intl), então continua correto se a
 * regra de fuso do Brasil mudar de novo.
 */
export function limitesDoDiaEmSaoPaulo(referencia: Date = new Date()): { inicio: Date; fim: Date } {
  const { hora, minuto, segundo } = partesEmFuso(referencia);
  const msDesdeMeiaNoite = ((hora * 60 + minuto) * 60 + segundo) * 1000 + referencia.getMilliseconds();
  const inicio = new Date(referencia.getTime() - msDesdeMeiaNoite);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fim };
}

export interface MetasPaciente {
  metaKcal: number;
  metaProteina: number;
  metaCarbo: number;
  metaGordura: number;
}

export interface RegistroParaSaldo {
  kcal: number;
  proteina: number;
  carbo: number;
  gordura: number;
}

export interface SaldoMacro {
  consumido: number;
  meta: number;
  percentual: number;
}

export interface SaldoDoDia {
  kcal: SaldoMacro;
  proteina: SaldoMacro;
  carbo: SaldoMacro;
  gordura: SaldoMacro;
}

function saldoMacro(consumido: number, meta: number): SaldoMacro {
  return { consumido, meta, percentual: meta > 0 ? Math.round((consumido / meta) * 100) : 0 };
}

/** Soma os registros do dia contra as metas — saldo é sempre derivado, nunca armazenado. */
export function calcularSaldoDoDia(registros: RegistroParaSaldo[], metas: MetasPaciente): SaldoDoDia {
  const totais = registros.reduce(
    (acc, registro) => ({
      kcal: acc.kcal + registro.kcal,
      proteina: acc.proteina + registro.proteina,
      carbo: acc.carbo + registro.carbo,
      gordura: acc.gordura + registro.gordura,
    }),
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 },
  );

  return {
    kcal: saldoMacro(totais.kcal, metas.metaKcal),
    proteina: saldoMacro(totais.proteina, metas.metaProteina),
    carbo: saldoMacro(totais.carbo, metas.metaCarbo),
    gordura: saldoMacro(totais.gordura, metas.metaGordura),
  };
}
