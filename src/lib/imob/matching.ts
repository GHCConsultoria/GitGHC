/**
 * Matching cliente×imóvel — função pura (sem I/O), testável isoladamente.
 * Calcula um percentual de compatibilidade (0..100) entre as preferências de
 * um cliente e um imóvel, considerando apenas os critérios que o cliente de
 * fato especificou (um cliente sem preferências não "casa" com nada — score 0
 * e lista vazia de critérios, nunca um número inventado).
 */

export interface PreferenciasCliente {
  prefTipoImovel: string | null;
  prefFinalidade: string | null;
  prefValorMin: number | null; // centavos
  prefValorMax: number | null; // centavos
  prefCidade: string | null;
  prefQuartos: number | null;
  prefVagas: number | null;
  prefAreaMinima: number | null; // m²
}

export interface DadosImovelMatch {
  tipo: string;
  finalidade: string;
  precoVenda: number | null;
  precoAluguel: number | null;
  cidade: string | null;
  quartos: number | null;
  vagas: number | null;
  areaTotal: number | null;
}

export interface CriterioMatch {
  nome: string;
  peso: number;
  atende: boolean;
}

export interface ResultadoMatch {
  score: number; // 0..100
  criterios: CriterioMatch[]; // só os critérios que o cliente especificou
}

const PESOS = {
  preco: 30,
  tipo: 20,
  cidade: 15,
  finalidade: 10,
  quartos: 10,
  area: 10,
  vagas: 5,
} as const;

function finalidadeCompativel(pref: string, imovel: string): boolean {
  if (pref === "VENDA_LOCACAO") return true;
  if (pref === "VENDA") return imovel === "VENDA" || imovel === "VENDA_LOCACAO";
  if (pref === "LOCACAO") return imovel === "LOCACAO" || imovel === "VENDA_LOCACAO";
  return false;
}

function precoDeReferencia(pref: PreferenciasCliente, imovel: DadosImovelMatch): number | null {
  if (pref.prefFinalidade === "LOCACAO") return imovel.precoAluguel;
  if (pref.prefFinalidade === "VENDA") return imovel.precoVenda;
  return imovel.precoVenda ?? imovel.precoAluguel;
}

function normalizar(texto: string): string {
  return texto.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function calcularCompatibilidade(pref: PreferenciasCliente, imovel: DadosImovelMatch): ResultadoMatch {
  const criterios: CriterioMatch[] = [];

  // Preço — dentro da faixa [min, max] (cada limite é opcional).
  if (pref.prefValorMin !== null || pref.prefValorMax !== null) {
    const preco = precoDeReferencia(pref, imovel);
    let atende = preco !== null;
    if (preco !== null) {
      if (pref.prefValorMin !== null && preco < pref.prefValorMin) atende = false;
      if (pref.prefValorMax !== null && preco > pref.prefValorMax) atende = false;
    }
    criterios.push({ nome: "Preço", peso: PESOS.preco, atende });
  }

  if (pref.prefTipoImovel) {
    criterios.push({ nome: "Tipo", peso: PESOS.tipo, atende: pref.prefTipoImovel === imovel.tipo });
  }

  if (pref.prefFinalidade) {
    criterios.push({
      nome: "Finalidade",
      peso: PESOS.finalidade,
      atende: finalidadeCompativel(pref.prefFinalidade, imovel.finalidade),
    });
  }

  if (pref.prefCidade) {
    criterios.push({
      nome: "Cidade",
      peso: PESOS.cidade,
      atende: imovel.cidade !== null && normalizar(imovel.cidade) === normalizar(pref.prefCidade),
    });
  }

  if (pref.prefQuartos !== null) {
    criterios.push({
      nome: "Quartos",
      peso: PESOS.quartos,
      atende: imovel.quartos !== null && imovel.quartos >= pref.prefQuartos,
    });
  }

  if (pref.prefVagas !== null) {
    criterios.push({
      nome: "Vagas",
      peso: PESOS.vagas,
      atende: imovel.vagas !== null && imovel.vagas >= pref.prefVagas,
    });
  }

  if (pref.prefAreaMinima !== null) {
    criterios.push({
      nome: "Área",
      peso: PESOS.area,
      atende: imovel.areaTotal !== null && imovel.areaTotal >= pref.prefAreaMinima,
    });
  }

  const pesoTotal = criterios.reduce((s, c) => s + c.peso, 0);
  if (pesoTotal === 0) return { score: 0, criterios: [] };
  const pesoAtingido = criterios.reduce((s, c) => s + (c.atende ? c.peso : 0), 0);
  const score = Math.round((pesoAtingido / pesoTotal) * 100);
  return { score, criterios };
}
