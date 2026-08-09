import { formatarNumeroCnjParaExibicao } from "@/lib/publicacoes/cnj";
import { formatarDataCalendario } from "@/lib/formatacao";

export interface DadosPreenchimentoModelo {
  cliente: string;
  numeroCnj: string;
  varaOrgao: string;
  tribunal: string;
  uf: string;
  tipoAto: string;
  descricao: string;
  dataFatal: Date;
  parteRepresentada: string;
  escritorio: string;
  oab: string;
}

const ROTULO_PARTE: Record<string, string> = {
  AUTOR: "Autor",
  REU: "Réu",
  TERCEIRO: "Terceiro",
};

/** Placeholders reconhecidos, na ordem em que aparecem em DadosPreenchimentoModelo — usado tanto pra preencher quanto pra listar na UI de edição de modelo. */
export const PLACEHOLDERS_MODELO = [
  "cliente",
  "numeroCnj",
  "varaOrgao",
  "tribunal",
  "uf",
  "tipoAto",
  "descricao",
  "dataFatal",
  "parteRepresentada",
  "escritorio",
  "oab",
] as const;

function valoresPorPlaceholder(dados: DadosPreenchimentoModelo): Record<(typeof PLACEHOLDERS_MODELO)[number], string> {
  return {
    cliente: dados.cliente,
    numeroCnj: formatarNumeroCnjParaExibicao(dados.numeroCnj),
    varaOrgao: dados.varaOrgao,
    tribunal: dados.tribunal,
    uf: dados.uf,
    tipoAto: dados.tipoAto,
    descricao: dados.descricao,
    dataFatal: formatarDataCalendario(dados.dataFatal),
    parteRepresentada: ROTULO_PARTE[dados.parteRepresentada] ?? dados.parteRepresentada,
    escritorio: dados.escritorio,
    oab: dados.oab,
  };
}

/**
 * Substitui {{placeholder}} pelo dado correspondente do prazo — puro texto,
 * sem IA envolvida, então o resultado é sempre 100% previsível (mesmo
 * princípio de "nunca inventar dado": um placeholder sem valor vira
 * [A PREENCHER: nome], nunca é omitido silenciosamente). Placeholder não
 * reconhecido (erro de digitação no modelo) fica intocado no texto, pra
 * quem revisar notar que algo não bateu.
 */
export function preencherModelo(conteudo: string, dados: DadosPreenchimentoModelo): string {
  const valores = valoresPorPlaceholder(dados);
  return conteudo.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, chave: string) => {
    if (!(chave in valores)) return match;
    const valor = valores[chave as (typeof PLACEHOLDERS_MODELO)[number]];
    return valor && valor.trim() !== "" ? valor : `[A PREENCHER: ${chave}]`;
  });
}
