import { describe, expect, it } from "vitest";
import {
  calcularFunil,
  calcularMetricas,
  desempenhoPorNicho,
  ehEstagioTerminal,
  type LeadParaBI,
  rankingMotivosPerda,
} from "./funil";

function lead(parcial: Partial<LeadParaBI>): LeadParaBI {
  return {
    estagio: "PROSPECCAO",
    origem: "PROSPECCAO_ATIVA",
    nicho: "Padaria",
    valorPotencialCentavos: null,
    valorFechadoCentavos: null,
    motivoPerdaDescricao: null,
    ...parcial,
  };
}

describe("ehEstagioTerminal", () => {
  it("marca GANHO e PERDIDO como terminais e o resto como não", () => {
    expect(ehEstagioTerminal("GANHO")).toBe(true);
    expect(ehEstagioTerminal("PERDIDO")).toBe(true);
    expect(ehEstagioTerminal("EM_NEGOCIACAO")).toBe(false);
    expect(ehEstagioTerminal("PROSPECCAO")).toBe(false);
  });
});

describe("calcularMetricas", () => {
  it("conta aberto/ganho/perdido e soma valores nas cestas certas", () => {
    const m = calcularMetricas([
      lead({ estagio: "GANHO", valorFechadoCentavos: 100_00 }),
      lead({ estagio: "GANHO", valorFechadoCentavos: 300_00 }),
      lead({ estagio: "PERDIDO" }),
      lead({ estagio: "EM_NEGOCIACAO", valorPotencialCentavos: 500_00 }),
    ]);
    expect(m.total).toBe(4);
    expect(m.ganhos).toBe(2);
    expect(m.perdidos).toBe(1);
    expect(m.emAberto).toBe(1);
    expect(m.valorGanhoCentavos).toBe(400_00);
    expect(m.valorEmAbertoCentavos).toBe(500_00);
    expect(m.ticketMedioCentavos).toBe(200_00);
  });

  it("taxa de conversão usa só leads decididos (ganhos+perdidos) como base", () => {
    const m = calcularMetricas([
      lead({ estagio: "GANHO", valorFechadoCentavos: 1 }),
      lead({ estagio: "GANHO", valorFechadoCentavos: 1 }),
      lead({ estagio: "GANHO", valorFechadoCentavos: 1 }),
      lead({ estagio: "PERDIDO" }),
      // 5 em aberto não devem afundar a taxa
      lead({ estagio: "PROSPECCAO" }),
      lead({ estagio: "VISITA_AGENDADA" }),
    ]);
    // 3 ganhos / 4 decididos = 75%
    expect(m.taxaConversao).toBe(75);
  });

  it("taxa e ticket são null quando não há base (evita divisão por zero)", () => {
    const m = calcularMetricas([lead({ estagio: "PROSPECCAO" })]);
    expect(m.taxaConversao).toBeNull();
    expect(m.ticketMedioCentavos).toBeNull();
  });

  it("ganho sem valorFechado cai no valorPotencial", () => {
    const m = calcularMetricas([lead({ estagio: "GANHO", valorPotencialCentavos: 250_00 })]);
    expect(m.valorGanhoCentavos).toBe(250_00);
  });
});

describe("calcularFunil", () => {
  it("conta alcance cumulativo: quem está adiante conta nos degraus anteriores", () => {
    const funil = calcularFunil([
      lead({ estagio: "PROSPECCAO" }),
      lead({ estagio: "EM_NEGOCIACAO" }),
      lead({ estagio: "GANHO", valorFechadoCentavos: 1 }),
    ]);
    const prospeccao = funil.find((d) => d.estagio === "PROSPECCAO");
    const negociacao = funil.find((d) => d.estagio === "EM_NEGOCIACAO");
    const ganho = funil.find((d) => d.estagio === "GANHO");
    // Todos os 3 passaram pela prospecção
    expect(prospeccao?.quantidadeAlcancou).toBe(3);
    // Negociação e ganho alcançaram negociação
    expect(negociacao?.quantidadeAlcancou).toBe(2);
    expect(ganho?.quantidadeAlcancou).toBe(1);
    expect(prospeccao?.quantidadeNoEstagio).toBe(1);
  });

  it("PERDIDO não entra na contagem cumulativa do funil", () => {
    const funil = calcularFunil([lead({ estagio: "PERDIDO" }), lead({ estagio: "PROSPECCAO" })]);
    const prospeccao = funil.find((d) => d.estagio === "PROSPECCAO");
    expect(prospeccao?.quantidadeAlcancou).toBe(1);
  });
});

describe("rankingMotivosPerda", () => {
  it("agrupa e ordena do motivo mais frequente ao menos", () => {
    const ranking = rankingMotivosPerda([
      lead({ estagio: "PERDIDO", motivoPerdaDescricao: "Preço" }),
      lead({ estagio: "PERDIDO", motivoPerdaDescricao: "Preço" }),
      lead({ estagio: "PERDIDO", motivoPerdaDescricao: "Já usa concorrente" }),
      lead({ estagio: "GANHO", valorFechadoCentavos: 1 }), // não é perda, ignora
    ]);
    expect(ranking).toEqual([
      { motivo: "Preço", quantidade: 2 },
      { motivo: "Já usa concorrente", quantidade: 1 },
    ]);
  });

  it("perdido sem motivo vira 'Sem motivo informado'", () => {
    const ranking = rankingMotivosPerda([lead({ estagio: "PERDIDO", motivoPerdaDescricao: null })]);
    expect(ranking).toEqual([{ motivo: "Sem motivo informado", quantidade: 1 }]);
  });
});

describe("desempenhoPorNicho", () => {
  it("fatia total/ganhos/taxa/valor por nicho e ordena por total", () => {
    const desempenho = desempenhoPorNicho([
      lead({ nicho: "Padaria", estagio: "GANHO", valorFechadoCentavos: 100_00 }),
      lead({ nicho: "Padaria", estagio: "PERDIDO" }),
      lead({ nicho: "Padaria", estagio: "PROSPECCAO" }),
      lead({ nicho: "Oficina", estagio: "GANHO", valorFechadoCentavos: 200_00 }),
    ]);
    expect(desempenho[0]?.nicho).toBe("Padaria");
    expect(desempenho[0]?.total).toBe(3);
    expect(desempenho[0]?.ganhos).toBe(1);
    // 1 ganho / 2 decididos = 50%
    expect(desempenho[0]?.taxaConversao).toBe(50);
    expect(desempenho[0]?.valorGanhoCentavos).toBe(100_00);
    expect(desempenho[1]?.nicho).toBe("Oficina");
    expect(desempenho[1]?.taxaConversao).toBe(100);
  });
});
