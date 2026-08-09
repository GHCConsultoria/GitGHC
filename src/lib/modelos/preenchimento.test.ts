import { describe, expect, it } from "vitest";
import { preencherModelo, type DadosPreenchimentoModelo } from "./preenchimento";

function dados(overrides: Partial<DadosPreenchimentoModelo> = {}): DadosPreenchimentoModelo {
  return {
    cliente: "João da Silva",
    numeroCnj: "12345678920258260100",
    varaOrgao: "1ª Vara Cível",
    tribunal: "TJSP",
    uf: "SP",
    tipoAto: "Contestação",
    descricao: "Prazo para contestar",
    dataFatal: new Date(Date.UTC(2026, 7, 25)),
    parteRepresentada: "AUTOR",
    escritorio: "Escritório Modelo",
    oab: "123456",
    ...overrides,
  };
}

describe("preencherModelo", () => {
  it("substitui placeholders conhecidos pelos dados do prazo", () => {
    const resultado = preencherModelo(
      "Cliente: {{cliente}} — Processo {{numeroCnj}} — {{tribunal}}/{{uf}} — vence em {{dataFatal}}",
      dados(),
    );
    expect(resultado).toBe(
      "Cliente: João da Silva — Processo 1234567-89.2025.8.26.0100 — TJSP/SP — vence em 25/08/2026",
    );
  });

  it("formata parteRepresentada com rótulo legível", () => {
    expect(preencherModelo("{{parteRepresentada}}", dados({ parteRepresentada: "REU" }))).toBe("Réu");
  });

  it("marca campo vazio como [A PREENCHER: ...] em vez de omitir", () => {
    expect(preencherModelo("Vara: {{varaOrgao}}", dados({ varaOrgao: "" }))).toBe("Vara: [A PREENCHER: varaOrgao]");
  });

  it("deixa placeholder desconhecido intocado", () => {
    expect(preencherModelo("{{campoInexistente}}", dados())).toBe("{{campoInexistente}}");
  });

  it("aceita espaços dentro das chaves", () => {
    expect(preencherModelo("{{ cliente }}", dados())).toBe("João da Silva");
  });
});
