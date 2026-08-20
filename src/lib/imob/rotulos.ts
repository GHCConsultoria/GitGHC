/**
 * Rótulos legíveis dos enums da Fase 2, para selects e exibição. Ponto único —
 * a UI nunca escreve "SALA_COMERCIAL" na tela, sempre passa por aqui.
 */

export const ROTULO_TIPO_IMOVEL: Record<string, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
  TERRENO: "Terreno",
  SALA_COMERCIAL: "Sala comercial",
  LOJA: "Loja",
  GALPAO: "Galpão",
  FAZENDA: "Fazenda",
  CHACARA: "Chácara",
  SITIO: "Sítio",
  PREDIO: "Prédio",
  OUTROS: "Outros",
};

export const ROTULO_FINALIDADE: Record<string, string> = {
  VENDA: "Venda",
  LOCACAO: "Locação",
  VENDA_LOCACAO: "Venda e locação",
};

export const ROTULO_STATUS_IMOVEL: Record<string, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  EM_NEGOCIACAO: "Em negociação",
  VENDIDO: "Vendido",
  ALUGADO: "Alugado",
  INATIVO: "Inativo",
};

export const ROTULO_TIPO_PESSOA: Record<string, string> = {
  FISICA: "Pessoa física",
  JURIDICA: "Pessoa jurídica",
};

export const ROTULO_TIPO_CLIENTE: Record<string, string> = {
  COMPRADOR: "Comprador",
  LOCATARIO: "Locatário",
  INVESTIDOR: "Investidor",
  PROPRIETARIO: "Proprietário",
  INTERESSADO: "Interessado",
};

export function rotulo(mapa: Record<string, string>, chave: string | null | undefined): string {
  if (!chave) return "—";
  return mapa[chave] ?? chave;
}
