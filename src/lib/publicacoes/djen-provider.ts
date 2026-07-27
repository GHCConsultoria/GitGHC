import { z } from "zod";
import type { BuscarPublicacoesParams, PublicacaoBruta, PublicacaoProvider } from "./provider";

export const DJEN_BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
export const DJEN_ITENS_POR_PAGINA = 100;

// O contrato de resposta da API pública do DJEN (Comunica PJe) não é coberto
// por um versionamento formal estável. O schema abaixo é deliberadamente
// tolerante — campos opcionais, `.passthrough()` — e o item bruto inteiro é
// sempre preservado em `rawJson`. Confirmado ao vivo (fora deste ambiente,
// que tem o host bloqueado): o envelope items/count e os parâmetros de
// query batem; os nomes de campo dentro de cada item ainda não foram
// validados contra uma publicação real (só testei com uma consulta sem
// resultado) — ajuste `mapearItemDjen` se não baterem na primeira consulta
// real com dados.
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

/**
 * Monta a URL de consulta para uma página. Exportada para ser reaproveitada
 * tanto pelo `DjenProvider` (roda no servidor) quanto pela busca feita no
 * navegador (ver `src/lib/publicacoes/buscar-no-navegador.ts`) — o DJEN
 * bloqueia chamadas vindas de infraestrutura de nuvem, então a busca real em
 * produção precisa sair da rede da própria pessoa.
 */
export function montarUrlBuscaDjen(params: BuscarPublicacoesParams, pagina: number): URL {
  const url = new URL(DJEN_BASE_URL);
  url.searchParams.set("numeroOab", params.oab);
  url.searchParams.set("ufOab", params.uf);
  url.searchParams.set("dataDisponibilizacaoInicio", params.dataInicio);
  url.searchParams.set("dataDisponibilizacaoFim", params.dataFim);
  url.searchParams.set("pagina", String(pagina));
  url.searchParams.set("itensPorPagina", String(DJEN_ITENS_POR_PAGINA));
  return url;
}

/** Valida e mapeia o corpo de uma resposta do DJEN para o formato interno. Lança se o formato for inesperado. */
export function interpretarRespostaDjen(corpo: unknown): PublicacaoBruta[] {
  const parsed = djenResponseSchema.safeParse(corpo);
  if (!parsed.success) {
    throw new Error(`Resposta do DJEN em formato inesperado: ${parsed.error.message}`);
  }
  const items = parsed.data.items ?? [];
  return items.map(mapearItemDjen);
}

/**
 * Provider concreto para o DJEN, consultado por OAB, rodando no servidor.
 * Uso real em produção esbarra em bloqueio de rede da infraestrutura de
 * nuvem (ver `buscar-no-navegador.ts` para o caminho que funciona).
 */
export class DjenProvider implements PublicacaoProvider {
  async buscarPublicacoes(params: BuscarPublicacoesParams): Promise<PublicacaoBruta[]> {
    const publicacoes: PublicacaoBruta[] = [];
    let pagina = 1;

    for (;;) {
      const url = montarUrlBuscaDjen(params, pagina);

      const resposta = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      if (!resposta.ok) {
        const corpoErro = await resposta.text().catch(() => "");
        throw new Error(
          `DJEN respondeu ${resposta.status} na página ${pagina}${corpoErro ? `: ${corpoErro.slice(0, 300)}` : ""}`,
        );
      }

      const corpo: unknown = await resposta.json();
      const items = interpretarRespostaDjen(corpo);
      if (items.length === 0) break;

      publicacoes.push(...items);

      if (items.length < DJEN_ITENS_POR_PAGINA) break;
      pagina += 1;
    }

    return publicacoes;
  }
}
