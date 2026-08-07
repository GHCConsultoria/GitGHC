import { z } from "zod";
import { gerarTexto } from "./anthropic";

export interface TipoAtoDisponivel {
  tipoAto: string;
  diasPrazo: number;
  contagemDiasUteis: boolean;
  descricao: string | null;
}

export interface SugestaoTipoAto {
  tipoAtoSugerido: string | null;
  justificativa: string;
}

const respostaIaSchema = z.object({
  tipoAtoSugerido: z.string().nullable(),
  justificativa: z.string(),
});

function montarPrompt(conteudoPublicacao: string, tiposDisponiveis: TipoAtoDisponivel[]): string {
  const listaTipos = tiposDisponiveis
    .map((tipo) => `- "${tipo.tipoAto}"${tipo.descricao ? `: ${tipo.descricao}` : ""} (${tipo.diasPrazo} dias)`)
    .join("\n");

  return [
    "Você é um assistente jurídico que classifica publicações do diário oficial pelo tipo de ato processual, para um sistema de controle de prazos de um escritório de advocacia brasileiro.",
    "",
    "Tipos de ato válidos — só pode escolher exatamente um destes valores (o texto entre aspas), ou null se nenhum bater com segurança:",
    listaTipos,
    "",
    "Texto da publicação:",
    '"""',
    conteudoPublicacao,
    '"""',
    "",
    "Responda SOMENTE com um JSON válido, sem texto antes ou depois, sem markdown, neste formato exato:",
    '{"tipoAtoSugerido": "<um dos valores da lista, entre aspas> ou null", "justificativa": "<1-2 frases explicando a escolha, ou por que nenhum tipo bate>"}',
    "",
    "Nunca escolha um tipo que não esteja na lista. Na dúvida, responda null — é preferível deixar para revisão manual do advogado a arriscar uma classificação errada.",
  ].join("\n");
}

function extrairJson(texto: string): unknown {
  const semFences = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(semFences);
}

/**
 * Pede à IA uma sugestão de tipo de ato para uma publicação que a
 * classificação por palavra-chave (src/lib/prazos/classificacao.ts) não
 * conseguiu resolver. É sempre uma SUGESTÃO — nunca cria ou altera um Prazo
 * sozinha; quem chama decide se usa (ver src/lib/ia/acoes.ts,
 * classificarPublicacaoComTipoAto). Se a IA sugerir algo fora da lista de
 * tipos cadastrados, é tratado como null — nunca inventamos um tipo novo.
 */
export async function sugerirTipoAto(
  conteudoPublicacao: string,
  tiposDisponiveis: TipoAtoDisponivel[],
): Promise<SugestaoTipoAto> {
  const prompt = montarPrompt(conteudoPublicacao, tiposDisponiveis);
  const texto = await gerarTexto({ prompt, maxTokens: 300 });

  let bruto: unknown;
  try {
    bruto = extrairJson(texto);
  } catch {
    return { tipoAtoSugerido: null, justificativa: "a IA não retornou um JSON válido — classifique manualmente" };
  }

  const parsed = respostaIaSchema.safeParse(bruto);
  if (!parsed.success) {
    return { tipoAtoSugerido: null, justificativa: "resposta da IA em formato inesperado — classifique manualmente" };
  }

  const tiposValidos = new Set(tiposDisponiveis.map((tipo) => tipo.tipoAto));
  if (parsed.data.tipoAtoSugerido && !tiposValidos.has(parsed.data.tipoAtoSugerido)) {
    return {
      tipoAtoSugerido: null,
      justificativa: `a IA sugeriu "${parsed.data.tipoAtoSugerido}", que não está cadastrado — classifique manualmente`,
    };
  }

  return parsed.data;
}
