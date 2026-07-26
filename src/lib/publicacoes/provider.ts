export interface BuscarPublicacoesParams {
  oab: string;
  uf: string;
  /** formato AAAA-MM-DD */
  dataInicio: string;
  /** formato AAAA-MM-DD */
  dataFim: string;
}

/**
 * Publicação como veio da fonte, antes de qualquer persistência. `rawJson`
 * guarda o item bruto inteiro — é o que sobrevive se o mapeamento de campos
 * específico da fonte estiver errado ou incompleto.
 */
export interface PublicacaoBruta {
  /** identificador da publicação na fonte, usado para compor o hash de idempotência */
  identificadorExterno: string;
  conteudo: string;
  /** ISO date/datetime string */
  dataDisponibilizacao: string;
  /** ISO date/datetime string, quando a fonte distingue disponibilização de publicação */
  dataPublicacao: string | null;
  fonte: string;
  rawJson: unknown;
}

/**
 * Porta de entrada de publicações. Cada diário/fonte concreta (DJEN hoje,
 * outros no futuro) implementa esta interface — a ingestão e o matching de
 * processo não sabem nem precisam saber de onde a publicação veio.
 */
export interface PublicacaoProvider {
  buscarPublicacoes(params: BuscarPublicacoesParams): Promise<PublicacaoBruta[]>;
}
