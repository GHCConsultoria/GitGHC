import { describe, expect, it } from "vitest";
import { interpretarNumeroCnj } from "./tribunal";

function cnj(segmento: string, tribunal: string): string {
  // 7 digitos + 2 dv + 4 ano + 1 segmento + 2 tribunal + 4 origem = 20
  return `1234567892025${segmento}${tribunal}0100`;
}

describe("interpretarNumeroCnj", () => {
  it("decodifica os extremos e um meio da tabela de justica estadual", () => {
    expect(interpretarNumeroCnj(cnj("8", "01"))).toEqual({ uf: "AC", tribunal: "TJAC" });
    expect(interpretarNumeroCnj(cnj("8", "07"))).toEqual({ uf: "DF", tribunal: "TJDFT" });
    expect(interpretarNumeroCnj(cnj("8", "26"))).toEqual({ uf: "SP", tribunal: "TJSP" });
    expect(interpretarNumeroCnj(cnj("8", "27"))).toEqual({ uf: "TO", tribunal: "TJTO" });
  });

  it("retorna null para segmentos que nao sao justica estadual (nao arrisca palpite)", () => {
    expect(interpretarNumeroCnj(cnj("4", "03"))).toBeNull(); // justica federal
    expect(interpretarNumeroCnj(cnj("5", "02"))).toBeNull(); // justica do trabalho
  });

  it("retorna null para codigo de tribunal fora da tabela", () => {
    expect(interpretarNumeroCnj(cnj("8", "99"))).toBeNull();
  });

  it("retorna null para numero com tamanho invalido", () => {
    expect(interpretarNumeroCnj("123")).toBeNull();
  });
});
