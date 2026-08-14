// Dinheiro no CRM é sempre inteiro em CENTAVOS — nunca float, pra não
// acumular erro de ponto flutuante em soma de valores de venda. Estes dois
// helpers são a única ponte entre os centavos guardados no banco e o texto
// em reais que o usuário digita/lê.

/** Formata centavos como moeda brasileira (ex.: 1234567 -> "R$ 12.345,67"). */
export function formatarMoeda(centavos: number | null | undefined): string {
  const valor = (centavos ?? 0) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Converte o que o usuário digitou (ex.: "12.345,67", "12345.67", "R$ 1.000")
 * em centavos inteiros. Aceita vazio como null. Retorna null quando o texto
 * não representa um número válido — o chamador decide se isso é erro. Tolera
 * as duas convenções de separador porque o campo é texto livre: se houver
 * vírgula, ela é o separador decimal (padrão BR) e os pontos são de milhar;
 * sem vírgula, um único ponto é tratado como decimal.
 */
export function parseMoedaParaCentavos(entrada: string | null | undefined): number | null {
  if (entrada === null || entrada === undefined) return null;
  const limpo = entrada.replace(/[R$\s]/g, "").trim();
  if (limpo === "") return null;

  let normalizado: string;
  if (limpo.includes(",")) {
    // Vírgula é o decimal; pontos são separador de milhar.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = limpo;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100);
}
