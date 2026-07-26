// Formato padrão do número CNJ (Resolução CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO
// (7 dígitos sequenciais, 2 dígitos verificadores, ano, segmento de justiça,
// tribunal, origem — 20 dígitos ao todo). Exige a pontuação por completo: em
// texto de publicação oficial o número quase sempre vem formatado assim, e
// exigir o formato reduz falsos positivos (não queremos "achar" um número de
// processo em qualquer sequência de 20 dígitos do texto).
const CNJ_FORMATADO_REGEX = /\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g;

/** Remove tudo que não for dígito. Usado tanto para armazenar Processo.numeroCnj quanto para comparar. */
export function normalizarNumeroCnj(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Extrai números de processo (CNJ) de um texto de publicação, normalizados
 * (só dígitos) e sem repetição. Não valida dígito verificador — apenas
 * reconhece o formato; a ligação com um Processo existente é quem decide se
 * o número "existe" para este escritório.
 */
export function extrairNumerosCnj(texto: string): string[] {
  const candidatos = texto.match(CNJ_FORMATADO_REGEX) ?? [];
  const normalizados = candidatos.map(normalizarNumeroCnj).filter((digitos) => digitos.length === 20);
  return Array.from(new Set(normalizados));
}
