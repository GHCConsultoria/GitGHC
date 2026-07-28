import type { Uf } from "@/lib/br/ufs";

// Resolução CNJ 65/2008: número único NNNNNNN-DD.AAAA.J.TR.OOOO. O dígito J
// (posição 14) identifica o segmento de justiça; para J=8 (Justiça Estadual)
// o código TR (posições 15-16) segue a ordem alfabética do nome do estado —
// confirmado contra três fontes independentes antes de codificar aqui. Para
// os demais segmentos (federal, trabalhista, eleitoral, militar) não
// codificamos a tabela: sem confirmação equivalente, um código errado
// sugeriria a UF errada pro cadastro, e a UF decide o calendário forense
// usado no cálculo do prazo — não vale o risco de "chutar".
const SEGMENTO_JUSTICA_ESTADUAL = "8";

const TJ_POR_CODIGO: Record<string, { uf: Uf; tribunal: string }> = {
  "01": { uf: "AC", tribunal: "TJAC" },
  "02": { uf: "AL", tribunal: "TJAL" },
  "03": { uf: "AP", tribunal: "TJAP" },
  "04": { uf: "AM", tribunal: "TJAM" },
  "05": { uf: "BA", tribunal: "TJBA" },
  "06": { uf: "CE", tribunal: "TJCE" },
  "07": { uf: "DF", tribunal: "TJDFT" },
  "08": { uf: "ES", tribunal: "TJES" },
  "09": { uf: "GO", tribunal: "TJGO" },
  "10": { uf: "MA", tribunal: "TJMA" },
  "11": { uf: "MT", tribunal: "TJMT" },
  "12": { uf: "MS", tribunal: "TJMS" },
  "13": { uf: "MG", tribunal: "TJMG" },
  "14": { uf: "PA", tribunal: "TJPA" },
  "15": { uf: "PB", tribunal: "TJPB" },
  "16": { uf: "PR", tribunal: "TJPR" },
  "17": { uf: "PE", tribunal: "TJPE" },
  "18": { uf: "PI", tribunal: "TJPI" },
  "19": { uf: "RJ", tribunal: "TJRJ" },
  "20": { uf: "RN", tribunal: "TJRN" },
  "21": { uf: "RS", tribunal: "TJRS" },
  "22": { uf: "RO", tribunal: "TJRO" },
  "23": { uf: "RR", tribunal: "TJRR" },
  "24": { uf: "SC", tribunal: "TJSC" },
  "25": { uf: "SE", tribunal: "TJSE" },
  "26": { uf: "SP", tribunal: "TJSP" },
  "27": { uf: "TO", tribunal: "TJTO" },
};

/**
 * Decodifica UF/tribunal a partir de um número CNJ normalizado (20 dígitos).
 * Só retorna algo para a Justiça Estadual — para qualquer outro segmento
 * (ou código de tribunal fora da tabela), retorna null em vez de arriscar
 * um palpite. Quem chama trata null como "sem sugestão", não como erro.
 */
export function interpretarNumeroCnj(numeroCnjNormalizado: string): { uf: Uf; tribunal: string } | null {
  if (numeroCnjNormalizado.length !== 20) return null;

  const segmento = numeroCnjNormalizado.slice(13, 14);
  if (segmento !== SEGMENTO_JUSTICA_ESTADUAL) return null;

  const codigoTribunal = numeroCnjNormalizado.slice(14, 16);
  return TJ_POR_CODIGO[codigoTribunal] ?? null;
}
