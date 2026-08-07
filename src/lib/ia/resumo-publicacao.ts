import { gerarTexto } from "./anthropic";

function montarPrompt(conteudo: string): string {
  return [
    "Resuma esta publicação de diário oficial para um advogado que precisa decidir rapidamente se aquilo é urgente.",
    "Regras:",
    "- Exatamente 3 linhas, cada uma uma frase curta, sem numeração e sem introdução.",
    "- Linha 1: do que se trata (tipo de ato/decisão), em termos simples.",
    "- Linha 2: o que precisa ser feito ou observado.",
    '- Linha 3: qualquer prazo, valor ou nome explicitamente mencionado no texto; se não houver nenhum, escreva "Sem prazo ou valor explícito no texto."',
    "Nunca invente informação que não esteja no texto abaixo — se não tiver certeza de algo, não mencione.",
    "",
    "Texto da publicação:",
    '"""',
    conteudo,
    '"""',
  ].join("\n");
}

/** Resumo em 3 linhas de uma publicação, pra não obrigar o advogado a ler o texto bruto todo pra saber se importa. Sempre rotulado como gerado por IA na interface. */
export async function resumirPublicacao(conteudo: string): Promise<string> {
  const texto = await gerarTexto({ prompt: montarPrompt(conteudo), maxTokens: 220 });
  return texto.trim();
}
