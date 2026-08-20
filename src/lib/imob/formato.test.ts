import { describe, expect, it } from "vitest";
import { apenasDigitos, centavosParaInput, centavosParaReais, reaisParaCentavos } from "./formato";

describe("reaisParaCentavos", () => {
  it("converte número decimal para centavos", () => {
    expect(reaisParaCentavos(1234.56)).toBe(123456);
    expect(reaisParaCentavos(0)).toBe(0);
  });

  it("aceita string no formato brasileiro (milhar . e decimal ,)", () => {
    expect(reaisParaCentavos("1.234,56")).toBe(123456);
    expect(reaisParaCentavos("500.000,00")).toBe(50000000);
    expect(reaisParaCentavos("R$ 1.000,00")).toBe(100000);
  });

  it("aceita string com ponto decimal simples", () => {
    expect(reaisParaCentavos("1234.56")).toBe(123456);
    expect(reaisParaCentavos("99.9")).toBe(9990);
  });

  it("vazio/null vira null (nunca 0 por engano)", () => {
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos(null)).toBeNull();
    expect(reaisParaCentavos(undefined)).toBeNull();
  });

  it("texto inválido vira null", () => {
    expect(reaisParaCentavos("abc")).toBeNull();
  });

  it("ida e volta preserva o valor", () => {
    const centavos = reaisParaCentavos("2.500,75");
    expect(centavos).toBe(250075);
    expect(centavosParaInput(centavos)).toBe("2500.75");
  });
});

describe("centavosParaReais", () => {
  it("formata em BRL", () => {
    // usa espaço não separável entre R$ e o número — comparamos por dígitos
    expect(centavosParaReais(123456).replace(/\s/g, " ")).toContain("1.234,56");
  });
  it("null vira string vazia", () => {
    expect(centavosParaReais(null)).toBe("");
  });
});

describe("apenasDigitos", () => {
  it("remove máscara de CPF/telefone", () => {
    expect(apenasDigitos("123.456.789-00")).toBe("12345678900");
    expect(apenasDigitos("(11) 99999-8888")).toBe("11999998888");
    expect(apenasDigitos(null)).toBe("");
  });
});
