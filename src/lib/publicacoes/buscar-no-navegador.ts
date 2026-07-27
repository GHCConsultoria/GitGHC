import type { BuscarPublicacoesParams, PublicacaoBruta } from "./provider";
import { DJEN_ITENS_POR_PAGINA, interpretarRespostaDjen, montarUrlBuscaDjen } from "./djen-provider";

/**
 * Busca publicações no DJEN diretamente do navegador de quem está usando o
 * sistema. Existe porque o DJEN bloqueia chamadas vindas de infraestrutura
 * de nuvem — confirmado: a mesma consulta funciona de uma rede
 * residencial/comercial comum e falha com 403 rodando na Vercel. Rodando no
 * navegador, a requisição sai da rede da própria pessoa, que não é
 * bloqueada. A API permite chamada cross-origin (Access-Control-Allow-Origin: *).
 *
 * Não define User-Agent — navegadores proíbem isso via fetch e mandam o seu
 * próprio de qualquer forma, o que é exatamente o que se quer aqui.
 */
export async function buscarPublicacoesNoNavegador(params: BuscarPublicacoesParams): Promise<PublicacaoBruta[]> {
  const publicacoes: PublicacaoBruta[] = [];
  let pagina = 1;

  for (;;) {
    const url = montarUrlBuscaDjen(params, pagina);

    const resposta = await fetch(url, { headers: { Accept: "application/json" } });
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
