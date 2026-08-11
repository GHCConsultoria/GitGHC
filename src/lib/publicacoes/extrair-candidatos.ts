import type { Uf } from "@/lib/br/ufs";
import { interpretarNumeroCnj } from "@/lib/cnj/tribunal";
import { extrairNumerosCnj } from "./cnj";

export interface CandidatosProcesso {
  numeroCnj: string | null;
  uf: Uf | null;
  tribunal: string | null;
  clienteSugerido: string | null;
}

// Rótulos comuns em texto de intimação/citação que costumam preceder o nome
// de uma parte. Cobrimos os dois polos (ativo e passivo) porque o texto
// sozinho não diz qual das partes é o cliente do escritório — por isso isto
// é sempre exposto como sugestão a conferir, nunca preenchido sem revisão.
const ROTULO_PARTE_REGEX =
  /\b(?:Autor(?:a)?|Requerente|Exequente|Reclamante|Embargante|Apelante|Agravante|Impetrante|R[ée]u|R[ée]|Requerid[oa]|Executad[oa]|Reclamad[oa]|Apelad[oa]|Agravad[oa]|Impetrad[oa])\s*:\s*([^,;\n]{2,80})/;

function extrairClienteSugerido(texto: string): string | null {
  const match = texto.match(ROTULO_PARTE_REGEX);
  if (!match) return null;
  let nome = match[1]?.trim().replace(/\s+/g, " ") ?? "";

  // " - " costuma separar o nome da parte do despacho/decisão que vem a
  // seguir no texto da publicação (ex.: "Joao da Silva - Vistos. Intime-se.")
  // — sem esse corte, o texto residual do ato vinha junto na sugestão.
  const indiceSeparador = nome.indexOf(" - ");
  if (indiceSeparador !== -1) {
    nome = nome.slice(0, indiceSeparador).trim();
  }

  return nome.length >= 2 ? nome : null;
}

/**
 * Extrai, de forma heurística, candidatos para pré-preencher o cadastro de
 * um novo processo a partir do texto de uma publicação NAO_IDENTIFICADA.
 * Nada aqui é gravado sozinho — é só o valor inicial de um formulário que o
 * usuário confere e edita antes de salvar (o sistema propõe, o humano
 * confirma, igual ao resto do produto).
 */
export function extrairCandidatosDeProcesso(texto: string): CandidatosProcesso {
  const [numeroCnj = null] = extrairNumerosCnj(texto);
  const decodificado = numeroCnj ? interpretarNumeroCnj(numeroCnj) : null;

  return {
    numeroCnj,
    uf: decodificado?.uf ?? null,
    tribunal: decodificado?.tribunal ?? null,
    clienteSugerido: extrairClienteSugerido(texto),
  };
}
