export interface DadosParaRascunho {
  cliente: string;
  numeroCnj: string;
  varaOrgao: string;
  tribunal: string;
  uf: string;
  tipoAto: string;
  descricao: string;
  parteRepresentada: string;
  textoPublicacao: string;
}

/**
 * Monta o prompt do rascunho. Instrui explicitamente a IA a marcar
 * [A PREENCHER: ...] em vez de inventar fato/dispositivo/jurisprudência —
 * mesmo princípio de "nunca inventar dado" que rege o resto do sistema,
 * só que aplicado a um texto em vez de uma data.
 */
export function montarPromptRascunho(dados: DadosParaRascunho): string {
  return [
    "Você é um assistente jurídico auxiliando um advogado brasileiro a preparar um RASCUNHO inicial de peça processual.",
    "Este texto é só um ponto de partida — o advogado vai revisar, corrigir e adaptar tudo antes de protocolar qualquer coisa. Nunca é enviado ou protocolado automaticamente.",
    "Nunca invente fatos, valores, jurisprudência, dispositivos legais ou datas que não estejam nos dados abaixo. Quando faltar informação necessária, escreva [A PREENCHER: o que falta] em vez de supor.",
    "",
    "Dados do processo:",
    `- Cliente representado: ${dados.cliente} (${dados.parteRepresentada})`,
    `- Processo: ${dados.numeroCnj}`,
    `- Vara/órgão: ${dados.varaOrgao} — ${dados.tribunal}/${dados.uf}`,
    `- Ato processual a responder: ${dados.tipoAto}`,
    `- Descrição do prazo: ${dados.descricao}`,
    "",
    "Texto da publicação/intimação que originou este prazo:",
    '"""',
    dados.textoPublicacao,
    '"""',
    "",
    `Redija um rascunho inicial de ${dados.tipoAto} em português jurídico brasileiro, com estrutura padrão (endereçamento, qualificação das partes, dos fatos, do direito, dos pedidos). Marque com [A PREENCHER: ...] qualquer trecho que dependa de informação que você não tem.`,
  ].join("\n");
}
