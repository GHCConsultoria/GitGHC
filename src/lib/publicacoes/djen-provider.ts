import { z } from "zod";
import type { BuscarPublicacoesParams, PublicacaoBruta, PublicacaoProvider } from "./provider";

const DJEN_BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const ITENS_POR_PAGINA = 100;

// O contrato de resposta da API pública do DJEN (Comunica PJe) não é coberto
// por um versionamento formal estável e não pôde ser confirmado ao vivo neste
// ambiente (egress bloqueado para comunicaapi.pje.jus.br pela política deste
// sandbox). O schema abaixo é deliberadamente tolerante — campos opcionais,
// `.passthrough()` — e o item bruto inteiro é sempre preservado em `rawJson`.
// ANTES DE CONFIAR NESTE ADAPTER EM PRODUÇÃO: rode uma busca real e confira
// se os nomes de campo abaixo (em especial `texto`, `numero_processo` e as
// variantes de data) batem com a resposta de verdade; ajuste `mapearItemDjen`
// se não baterem.
const djenItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    numero_comunicacao: z.union([z.string(), z.number()]).optional(),
    texto: z.string().optional(),
    numero_processo: z.string().optional(),
    numeroprocessocommascara: z.string().optional(),
    data_disponibilizacao: z.string().optional(),
    datadisponibilizacao: z.string().optional(),
    data_publicacao: z.string().optional(),
  })
  .passthrough();

const djenResponseSchema = z
  .object({
    items: z.array(djenItemSchema).optional(),
    count: z.number().optional(),
  })
  .passthrough();

type DjenItem = z.infer<typeof djenItemSchema>;

function mapearItemDjen(item: DjenItem): PublicacaoBruta {
  const identificadorExterno = String(item.id ?? item.numero_comunicacao ?? "");
  const dataDisponibilizacao = item.data_disponibilizacao ?? item.datadisponibilizacao ?? "";

  return {
    identificadorExterno,
    conteudo: item.texto ?? "",
    dataDisponibilizacao,
    dataPublicacao: item.data_publicacao ?? null,
    fonte: "DJEN",
    rawJson: item,
  };
}

/** Provider concreto para o DJEN (Comunica PJe / CNJ), consultado por OAB. */
export class DjenProvider implements PublicacaoProvider {
  async buscarPublicacoes({ oab, uf, dataInicio, dataFim }: BuscarPublicacoesParams): Promise<PublicacaoBruta[]> {
    const publicacoes: PublicacaoBruta[] = [];
    let pagina = 1;

    for (;;) {
      const url = new URL(DJEN_BASE_URL);
      url.searchParams.set("numeroOab", oab);
      url.searchParams.set("ufOab", uf);
      url.searchParams.set("dataDisponibilizacaoInicio", dataInicio);
      url.searchParams.set("dataDisponibilizacaoFim", dataFim);
      url.searchParams.set("pagina", String(pagina));
      url.searchParams.set("itensPorPagina", String(ITENS_POR_PAGINA));

      // Sem um User-Agent "de navegador", a API respondeu 403 quando chamada
      // de dentro da infraestrutura da Vercel (funciona normalmente de uma
      // rede residencial/comercial comum — ver investigação em produção).
      // Provável WAF/CloudFront bloqueando por assinatura de requisição, não
      // necessariamente algo que este header sozinho resolve se for bloqueio
      // por faixa de IP de provedor de nuvem.
      const resposta = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      if (!resposta.ok) {
        // Corpo do erro ajuda a diferenciar bloqueio de WAF/rate-limit de um
        // erro de parâmetro — sem isso, um 403 e um 429 ficam indistinguíveis
        // no painel de saúde.
        const corpoErro = await resposta.text().catch(() => "");
        throw new Error(
          `DJEN respondeu ${resposta.status} na página ${pagina}${corpoErro ? `: ${corpoErro.slice(0, 300)}` : ""}`,
        );
      }

      const corpo: unknown = await resposta.json();
      const parsed = djenResponseSchema.safeParse(corpo);
      if (!parsed.success) {
        throw new Error(`Resposta do DJEN em formato inesperado: ${parsed.error.message}`);
      }

      const items = parsed.data.items ?? [];
      if (items.length === 0) break;

      publicacoes.push(...items.map(mapearItemDjen));

      if (items.length < ITENS_POR_PAGINA) break;
      pagina += 1;
    }

    return publicacoes;
  }
}
