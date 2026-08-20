/**
 * Geração de CSV — função pura, testável. Segue o essencial do RFC 4180:
 * separador vírgula, campos com aspas quando contêm vírgula/aspas/quebra de
 * linha, aspas duplicadas escapadas (""). Prefixado com BOM UTF-8 para o Excel
 * abrir acentos corretamente.
 */

const BOM = "﻿";

function escaparCampo(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const s = String(valor);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export interface ColunaCsv<T> {
  cabecalho: string;
  valor: (linha: T) => unknown;
}

/** Monta o texto CSV a partir das linhas e da definição de colunas. */
export function gerarCsv<T>(linhas: readonly T[], colunas: readonly ColunaCsv<T>[]): string {
  const cabecalho = colunas.map((c) => escaparCampo(c.cabecalho)).join(",");
  const corpo = linhas.map((linha) => colunas.map((c) => escaparCampo(c.valor(linha))).join(","));
  return BOM + [cabecalho, ...corpo].join("\r\n");
}
