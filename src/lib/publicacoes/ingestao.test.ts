import { randomUUID } from "node:crypto";
import { ParteRepresentada, StatusPublicacao } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ingerirPublicacoes } from "./ingestao";
import type { PublicacaoBruta, PublicacaoProvider } from "./provider";

class ProviderFalso implements PublicacaoProvider {
  constructor(private readonly publicacoes: PublicacaoBruta[]) {}

  async buscarPublicacoes(): Promise<PublicacaoBruta[]> {
    return this.publicacoes;
  }
}

describe("ingerirPublicacoes", () => {
  const sufixo = randomUUID();
  const escritorioId = `test-escritorio-${sufixo}`;
  const numeroCnjFormatado = "1234567-89.2025.8.26.0100";
  const numeroCnjNormalizado = "12345678920258260100";
  let processoId: string;

  beforeAll(async () => {
    await prisma.escritorio.create({
      data: {
        id: escritorioId,
        nome: `Escritorio Teste ${sufixo}`,
        oab: "999999/SP",
        uf: "SP",
      },
    });

    const processo = await prisma.processo.create({
      data: {
        escritorioId,
        numeroCnj: numeroCnjNormalizado,
        cliente: "Cliente Teste",
        varaOrgao: "1a Vara Civel",
        uf: "SP",
        tribunal: "TJSP",
        parteRepresentada: ParteRepresentada.REU,
      },
    });
    processoId = processo.id;
  });

  afterAll(async () => {
    // Publicacao nao tem escritorioId (so ganha um processoId quando vinculada),
    // entao a limpeza nao pode depender so da relacao com Processo — o caso
    // NAO_IDENTIFICADA fica sem processo nenhum. Por isso todo conteudo de
    // teste carrega o sufixo unico, usado aqui para limpar tudo que este
    // describe criou.
    await prisma.publicacao.deleteMany({ where: { conteudo: { contains: sufixo } } });
    await prisma.processo.deleteMany({ where: { escritorioId } });
    await prisma.escritorio.delete({ where: { id: escritorioId } });
  });

  it("vincula a publicacao ao processo quando o CNJ do texto casa com um processo existente", async () => {
    const provider = new ProviderFalso([
      {
        identificadorExterno: `vinculada-${sufixo}`,
        conteudo: `Intimacao referente ao processo ${numeroCnjFormatado} [${sufixo}].`,
        dataDisponibilizacao: "2026-03-02",
        dataPublicacao: null,
        fonte: "DJEN",
        rawJson: { origem: "teste" },
      },
    ]);

    const resultado = await ingerirPublicacoes(
      { escritorioId, oab: "999999", uf: "SP", dataInicio: "2026-03-01", dataFim: "2026-03-03" },
      provider,
    );

    expect(resultado.novas).toBe(1);
    expect(resultado.vinculadas).toBe(1);
    expect(resultado.naoIdentificadas).toBe(0);

    const publicacao = await prisma.publicacao.findFirst({
      where: { conteudo: { contains: numeroCnjFormatado } },
    });
    expect(publicacao?.status).toBe(StatusPublicacao.VINCULADA);
    expect(publicacao?.processoId).toBe(processoId);
  });

  it("manda para NAO_IDENTIFICADA quando nenhum processo casa com o CNJ do texto, sem lancar erro", async () => {
    const provider = new ProviderFalso([
      {
        identificadorExterno: `orfa-${sufixo}`,
        conteudo: `Intimacao referente ao processo 5555555-55.2025.8.26.9999, sem processo cadastrado [${sufixo}].`,
        dataDisponibilizacao: "2026-03-05",
        dataPublicacao: null,
        fonte: "DJEN",
        rawJson: { origem: "teste" },
      },
    ]);

    const resultado = await ingerirPublicacoes(
      { escritorioId, oab: "999999", uf: "SP", dataInicio: "2026-03-04", dataFim: "2026-03-06" },
      provider,
    );

    expect(resultado.novas).toBe(1);
    expect(resultado.naoIdentificadas).toBe(1);
    expect(resultado.vinculadas).toBe(0);

    const publicacao = await prisma.publicacao.findFirst({
      where: { conteudo: { contains: "5555555-55.2025.8.26.9999" } },
    });
    expect(publicacao?.status).toBe(StatusPublicacao.NAO_IDENTIFICADA);
    expect(publicacao?.processoId).toBeNull();
  });

  it("e idempotente: reprocessar o mesmo periodo nao duplica a publicacao", async () => {
    const identificadorExterno = `idempotente-${sufixo}`;
    const publicacaoBruta: PublicacaoBruta = {
      identificadorExterno,
      conteudo: `Segunda intimacao no processo ${numeroCnjFormatado}, para teste de idempotencia [${sufixo}].`,
      dataDisponibilizacao: "2026-03-10",
      dataPublicacao: null,
      fonte: "DJEN",
      rawJson: { origem: "teste" },
    };
    const provider = new ProviderFalso([publicacaoBruta]);
    const params = { escritorioId, oab: "999999", uf: "SP", dataInicio: "2026-03-09", dataFim: "2026-03-11" };

    const primeira = await ingerirPublicacoes(params, provider);
    expect(primeira.novas).toBe(1);
    expect(primeira.jaExistentes).toBe(0);

    const segunda = await ingerirPublicacoes(params, provider);
    expect(segunda.novas).toBe(0);
    expect(segunda.jaExistentes).toBe(1);

    const total = await prisma.publicacao.count({
      where: { conteudo: { contains: "teste de idempotencia" } },
    });
    expect(total).toBe(1);
  });
});
