import { describe, expect, it } from "vitest";
import { calcularCompatibilidade, type DadosImovelMatch, type PreferenciasCliente } from "./matching";

const prefVazias: PreferenciasCliente = {
  prefTipoImovel: null,
  prefFinalidade: null,
  prefValorMin: null,
  prefValorMax: null,
  prefCidade: null,
  prefQuartos: null,
  prefVagas: null,
  prefAreaMinima: null,
};

const imovel: DadosImovelMatch = {
  tipo: "APARTAMENTO",
  finalidade: "VENDA",
  precoVenda: 50000000, // R$ 500.000
  precoAluguel: null,
  cidade: "São Paulo",
  quartos: 3,
  vagas: 2,
  areaTotal: 90,
};

describe("calcularCompatibilidade", () => {
  it("cliente sem preferências não casa com nada (score 0, sem critérios)", () => {
    const r = calcularCompatibilidade(prefVazias, imovel);
    expect(r.score).toBe(0);
    expect(r.criterios).toHaveLength(0);
  });

  it("todos os critérios atendidos → 100%", () => {
    const pref: PreferenciasCliente = {
      prefTipoImovel: "APARTAMENTO",
      prefFinalidade: "VENDA",
      prefValorMin: 40000000,
      prefValorMax: 60000000,
      prefCidade: "sao paulo", // sem acento/caixa
      prefQuartos: 2,
      prefVagas: 1,
      prefAreaMinima: 80,
    };
    const r = calcularCompatibilidade(pref, imovel);
    expect(r.score).toBe(100);
    expect(r.criterios.every((c) => c.atende)).toBe(true);
  });

  it("preço acima do máximo derruba o critério de preço", () => {
    const pref: PreferenciasCliente = { ...prefVazias, prefValorMax: 40000000 };
    const r = calcularCompatibilidade(pref, imovel);
    expect(r.score).toBe(0);
    expect(r.criterios[0]?.nome).toBe("Preço");
    expect(r.criterios[0]?.atende).toBe(false);
  });

  it("pondera pelos pesos dos critérios especificados", () => {
    // tipo (20, atende) + cidade (15, não atende) → 20/35 ≈ 57
    const pref: PreferenciasCliente = {
      ...prefVazias,
      prefTipoImovel: "APARTAMENTO",
      prefCidade: "Campinas",
    };
    const r = calcularCompatibilidade(pref, imovel);
    expect(r.score).toBe(Math.round((20 / 35) * 100));
  });

  it("finalidade VENDA_LOCACAO do imóvel casa com preferência de LOCAÇÃO", () => {
    const imovelMisto: DadosImovelMatch = { ...imovel, finalidade: "VENDA_LOCACAO", precoAluguel: 300000 };
    const pref: PreferenciasCliente = { ...prefVazias, prefFinalidade: "LOCACAO" };
    const r = calcularCompatibilidade(pref, imovelMisto);
    expect(r.criterios[0]?.atende).toBe(true);
  });

  it("usa o preço de aluguel quando a preferência é locação", () => {
    const imovelLoc: DadosImovelMatch = { ...imovel, finalidade: "VENDA_LOCACAO", precoAluguel: 300000 };
    const pref: PreferenciasCliente = {
      ...prefVazias,
      prefValorMin: 200000,
      prefValorMax: 400000,
      prefFinalidade: "LOCACAO",
    };
    const r = calcularCompatibilidade(pref, imovelLoc);
    const criterioPreco = r.criterios.find((c) => c.nome === "Preço");
    expect(criterioPreco?.atende).toBe(true);
  });
});
