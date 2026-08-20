/**
 * Helpers puros de formatação/conversão do produto imobiliário. Sem I/O —
 * testáveis isoladamente. Dinheiro trafega em CENTAVOS (Int) no banco; a UI
 * usa reais. Datas voltadas ao usuário sempre em America/Sao_Paulo.
 */

const FUSO = "America/Sao_Paulo";

/** "1.234,56" | "1234.56" | 1234.56 → 123456 (centavos). null se vazio. */
export function reaisParaCentavos(entrada: string | number | null | undefined): number | null {
  if (entrada === null || entrada === undefined || entrada === "") return null;
  if (typeof entrada === "number") {
    return Number.isFinite(entrada) ? Math.round(entrada * 100) : null;
  }
  const limpo = entrada
    .trim()
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove separador de milhar
    .replace(",", ".");
  if (limpo === "") return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? Math.round(valor * 100) : null;
}

/** 123456 (centavos) → "R$ 1.234,56". Vazio para null. */
export function centavosParaReais(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** 123456 (centavos) → "1234.56" (para value de input numérico). */
export function centavosParaInput(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2);
}

export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** Remove tudo que não é dígito (CPF/CNPJ/telefone). */
export function apenasDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}
