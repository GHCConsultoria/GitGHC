/**
 * Cálculo de comissão — funções puras, testáveis sem I/O. Tudo em centavos
 * (Int) para não perder centavos por arredondamento. A distribuição entre os
 * papéis usa o método do maior resto (largest remainder), garantindo que a
 * soma das partes seja EXATAMENTE a comissão total (nenhum centavo some ou
 * apareça do nada).
 */

export interface DistribuicaoComissao {
  corretorVendedor: number; // percentuais (devem somar 100)
  corretorCaptador: number;
  gerente: number;
  imobiliaria: number;
}

export interface PartesComissao {
  corretorVendedor: number; // centavos
  corretorCaptador: number;
  gerente: number;
  imobiliaria: number;
}

export interface ResultadoComissao {
  comissaoTotal: number; // centavos
  partes: PartesComissao;
}

export class DistribuicaoInvalidaError extends Error {}

/** A distribuição precisa somar 100% (com folga de arredondamento de 0,01). */
export function distribuicaoValida(dist: DistribuicaoComissao): boolean {
  const soma = dist.corretorVendedor + dist.corretorCaptador + dist.gerente + dist.imobiliaria;
  return Math.abs(soma - 100) < 0.01;
}

/**
 * Reparte `total` (centavos) segundo os percentuais, sem perder centavos:
 * arredonda cada parte para baixo e distribui os centavos restantes para as
 * maiores frações (maior resto).
 */
function repartirCentavos(total: number, percentuais: number[]): number[] {
  const brutos = percentuais.map((p) => (total * p) / 100);
  const base = brutos.map((v) => Math.floor(v));
  let resto = total - base.reduce((s, v) => s + v, 0);
  // índices ordenados pela maior fração decimal
  const ordem = brutos
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);
  const resultado = [...base];
  let k = 0;
  while (resto > 0 && ordem.length > 0) {
    resultado[ordem[k % ordem.length]] += 1;
    resto -= 1;
    k += 1;
  }
  return resultado;
}

/**
 * Comissão sobre `valorBase` (centavos) à alíquota `percentualTotal` (ex.: 6),
 * repartida entre os papéis conforme `dist` (percentuais somando 100).
 */
export function calcularComissao(
  valorBase: number,
  percentualTotal: number,
  dist: DistribuicaoComissao,
): ResultadoComissao {
  if (!distribuicaoValida(dist)) {
    throw new DistribuicaoInvalidaError("os percentuais de distribuição devem somar 100%");
  }
  const comissaoTotal = Math.round((valorBase * percentualTotal) / 100);
  const [corretorVendedor, corretorCaptador, gerente, imobiliaria] = repartirCentavos(comissaoTotal, [
    dist.corretorVendedor,
    dist.corretorCaptador,
    dist.gerente,
    dist.imobiliaria,
  ]);
  return { comissaoTotal, partes: { corretorVendedor, corretorCaptador, gerente, imobiliaria } };
}
