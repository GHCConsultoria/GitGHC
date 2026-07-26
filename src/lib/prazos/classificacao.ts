// Sugestão de tipoAto a partir do texto da publicação — por palavra-chave,
// determinística, sem IA/ML. É só uma sugestão: o prazo em si continua sendo
// calculado pela regra determinística do motor (Fase 3) e sempre depende de
// confirmação humana (Fase 4). Se nada bater, a publicação não vira Prazo
// automaticamente — fica como está, aguardando classificação manual futura.
const PALAVRAS_CHAVE_POR_TIPO_ATO: Record<string, string[]> = {
  contestacao: ["contestação", "contestacao"],
  apelacao: ["apelação", "apelacao"],
  embargos_de_declaracao: ["embargos de declaração", "embargos de declaracao"],
};

export function classificarTipoAto(conteudo: string): string | null {
  const textoNormalizado = conteudo.toLowerCase();
  for (const [tipoAto, palavrasChave] of Object.entries(PALAVRAS_CHAVE_POR_TIPO_ATO)) {
    if (palavrasChave.some((palavra) => textoNormalizado.includes(palavra))) {
      return tipoAto;
    }
  }
  return null;
}
