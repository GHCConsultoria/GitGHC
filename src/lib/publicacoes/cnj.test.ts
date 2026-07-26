import { describe, expect, it } from "vitest";
import { extrairNumerosCnj, normalizarNumeroCnj } from "./cnj";

describe("normalizarNumeroCnj", () => {
  it("remove pontuacao mantendo apenas os digitos", () => {
    expect(normalizarNumeroCnj("1234567-89.2025.8.26.0100")).toBe("12345678920258260100");
  });

  it("mantem string ja normalizada inalterada", () => {
    expect(normalizarNumeroCnj("12345678920258260100")).toBe("12345678920258260100");
  });

  it("ignora letras e espacos junto com a pontuacao", () => {
    expect(normalizarNumeroCnj("Processo nº 1234567-89.2025.8.26.0100 ")).toBe(
      "12345678920258260100",
    );
  });
});

describe("extrairNumerosCnj", () => {
  it("extrai um numero CNJ formatado de dentro de um texto", () => {
    const texto = "Fica a parte intimada nos autos do processo 1234567-89.2025.8.26.0100.";
    expect(extrairNumerosCnj(texto)).toEqual(["12345678920258260100"]);
  });

  it("extrai multiplos numeros distintos sem duplicar repeticoes", () => {
    const texto = [
      "Processo principal: 1234567-89.2025.8.26.0100.",
      "Apenso: 9876543-21.2024.8.26.0100.",
      "Ver tambem 1234567-89.2025.8.26.0100 acima.",
    ].join(" ");
    expect(extrairNumerosCnj(texto)).toEqual([
      "12345678920258260100",
      "98765432120248260100",
    ]);
  });

  it("retorna lista vazia quando o texto nao tem numero CNJ formatado", () => {
    const texto = "Comunicado geral sem numero de processo.";
    expect(extrairNumerosCnj(texto)).toEqual([]);
  });

  it("nao confunde uma sequencia solta de 20 digitos com um CNJ", () => {
    const texto = "Protocolo interno 12345678901234567890 sem relacao com CNJ.";
    expect(extrairNumerosCnj(texto)).toEqual([]);
  });
});
