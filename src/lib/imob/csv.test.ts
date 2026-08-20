import { describe, expect, it } from "vitest";
import { type ColunaCsv, gerarCsv } from "./csv";

interface Linha {
  nome: string;
  valor: number;
  obs: string | null;
}

const colunas: ColunaCsv<Linha>[] = [
  { cabecalho: "Nome", valor: (l) => l.nome },
  { cabecalho: "Valor", valor: (l) => l.valor },
  { cabecalho: "Observação", valor: (l) => l.obs },
];

function semBom(s: string): string {
  return s.replace(/^﻿/, "");
}

describe("gerarCsv", () => {
  it("gera cabeçalho e linhas separadas por CRLF", () => {
    const csv = semBom(gerarCsv([{ nome: "Ana", valor: 10, obs: null }], colunas));
    expect(csv).toBe("Nome,Valor,Observação\r\nAna,10,");
  });

  it("escapa campos com vírgula, aspas e quebra de linha", () => {
    const csv = semBom(gerarCsv([{ nome: 'Silva, "Jr"', valor: 5, obs: "linha1\nlinha2" }], colunas));
    expect(csv).toContain('"Silva, ""Jr"""');
    expect(csv).toContain('"linha1\nlinha2"');
  });

  it("começa com BOM UTF-8", () => {
    const csv = gerarCsv([], colunas);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("lista vazia produz só o cabeçalho", () => {
    expect(semBom(gerarCsv([], colunas))).toBe("Nome,Valor,Observação");
  });
});
