import { describe, expect, it } from "vitest";
import { extrairCandidatosDeProcesso } from "./extrair-candidatos";

describe("extrairCandidatosDeProcesso", () => {
  it("extrai numero CNJ, uf/tribunal (justica estadual) e cliente sugerido", () => {
    const texto =
      "Processo 1234567-89.2025.8.26.0100 - Procedimento Comum Civel - " +
      "Requerido: Joao da Silva - Vistos. Intime-se.";

    const resultado = extrairCandidatosDeProcesso(texto);

    expect(resultado.numeroCnj).toBe("12345678920258260100");
    expect(resultado.uf).toBe("SP");
    expect(resultado.tribunal).toBe("TJSP");
    expect(resultado.clienteSugerido).toBe("Joao da Silva");
  });

  it("nao sugere uf/tribunal quando o segmento nao e justica estadual", () => {
    const texto = "Processo 1234567-89.2025.4.03.0100 - Requerente: Empresa XYZ Ltda";
    const resultado = extrairCandidatosDeProcesso(texto);

    expect(resultado.numeroCnj).toBe("12345678920254030100");
    expect(resultado.uf).toBeNull();
    expect(resultado.tribunal).toBeNull();
    expect(resultado.clienteSugerido).toBe("Empresa XYZ Ltda");
  });

  it("retorna tudo null quando o texto nao tem nenhum sinal reconhecivel", () => {
    const resultado = extrairCandidatosDeProcesso("Texto qualquer sem numero de processo nem rotulo de parte.");

    expect(resultado.numeroCnj).toBeNull();
    expect(resultado.uf).toBeNull();
    expect(resultado.tribunal).toBeNull();
    expect(resultado.clienteSugerido).toBeNull();
  });
});
