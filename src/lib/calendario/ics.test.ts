import { describe, expect, it } from "vitest";
import { gerarFeedIcs, type PrazoParaIcs } from "./ics";

function prazoBase(overrides: Partial<PrazoParaIcs> = {}): PrazoParaIcs {
  return {
    id: "prazo-1",
    dataFatal: new Date(Date.UTC(2026, 6, 28)), // 28/07/2026
    tipoAto: "Contestação",
    descricao: "Prazo para contestar",
    cliente: "João da Silva",
    numeroCnj: "12345678920258260100",
    varaOrgao: "1a Vara Cível",
    ...overrides,
  };
}

describe("gerarFeedIcs", () => {
  it("gera um VEVENT de dia inteiro sem deslocar a data por fuso horario", () => {
    const feed = gerarFeedIcs("Escritorio Teste — Prazos", [prazoBase()], new Date(Date.UTC(2026, 6, 1, 12)));

    expect(feed).toContain("DTSTART;VALUE=DATE:20260728");
    expect(feed).toContain("DTEND;VALUE=DATE:20260729");
    expect(feed).toContain("UID:prazo-prazo-1@gitghc");
  });

  it("usa CRLF como quebra de linha e envolve em BEGIN/END:VCALENDAR", () => {
    const feed = gerarFeedIcs("Teste", [prazoBase()]);

    expect(feed.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(feed.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(feed).not.toMatch(/[^\r]\n/); // todo \n deve vir precedido de \r
  });

  it("escapa virgula, ponto-e-virgula e quebra de linha em campos texto", () => {
    const feed = gerarFeedIcs(
      "Teste",
      [prazoBase({ cliente: "Silva, João; Ltda", descricao: "Linha 1\nLinha 2" })],
    );

    expect(feed).toContain("Silva\\, João\\; Ltda");
    expect(feed).toContain("Linha 1\\nLinha 2");
  });

  it("dobra linhas longas sem quebrar caracteres multi-byte no meio", () => {
    const descricaoLonga =
      "Descrição bem longa com acentuação: ação, atenção, informação, situação, petição inicial protocolada";
    const feed = gerarFeedIcs("Teste", [prazoBase({ descricao: descricaoLonga })]);

    // toda linha (exceto a ultima, sem \r\n) deve caber em <=75 bytes UTF-8
    const linhasFisicas = feed.split("\r\n").slice(0, -1);
    for (const linha of linhasFisicas) {
      expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
    }
    // reconstroi o valor dobrado (linhas de continuacao comecam com espaco) e confere que nao truncou/corrompeu texto
    expect(feed.replace(/\r\n /g, "")).toContain("informação\\, situação\\, petição");
  });

  it("nao inclui nenhum VEVENT quando a lista de prazos esta vazia", () => {
    const feed = gerarFeedIcs("Teste", []);
    expect(feed).not.toContain("BEGIN:VEVENT");
  });
});
