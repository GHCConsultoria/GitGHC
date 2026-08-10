import { describe, expect, it } from "vitest";
import { buscarPerguntas, PERGUNTAS_AJUDA } from "./perguntas";

describe("buscarPerguntas", () => {
  it("string vazia devolve todas as perguntas", () => {
    expect(buscarPerguntas("")).toHaveLength(PERGUNTAS_AJUDA.length);
  });

  it("acha pergunta por palavra no texto da pergunta", () => {
    const resultado = buscarPerguntas("confirmar prazo");
    expect(resultado.some((item) => item.id === "confirmar-prazo")).toBe(true);
  });

  it("acha pergunta por palavra-chave mesmo sem estar no texto da pergunta", () => {
    const resultado = buscarPerguntas("csv");
    expect(resultado[0]?.id).toBe("importar-csv");
  });

  it("ignora acento e caixa na busca", () => {
    const comAcento = buscarPerguntas("MODELOS DE PETIÇÃO");
    const semAcento = buscarPerguntas("modelos de peticao");
    expect(comAcento.map((i) => i.id)).toEqual(semAcento.map((i) => i.id));
    expect(comAcento.some((item) => item.id === "modelos-peticao")).toBe(true);
  });

  it("consulta sem nenhum termo correspondente devolve lista vazia", () => {
    expect(buscarPerguntas("xablauzinho impossivel")).toHaveLength(0);
  });
});
