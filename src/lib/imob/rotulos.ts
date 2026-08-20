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

// --- Fase 3 ---------------------------------------------------------------

export const ROTULO_ORIGEM_LEAD: Record<string, string> = {
  SITE: "Site",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  PORTAL: "Portal imobiliário",
  INDICACAO: "Indicação",
  GOOGLE: "Google",
  TELEFONE: "Telefone",
  PRESENCIAL: "Presencial",
  OUTROS: "Outros",
};

export const ROTULO_ETAPA_LEAD: Record<string, string> = {
  NOVO: "Novo lead",
  CONTATO_REALIZADO: "Contato realizado",
  QUALIFICACAO: "Qualificação",
  VISITA_AGENDADA: "Visita agendada",
  VISITA_REALIZADA: "Visita realizada",
  PROPOSTA: "Proposta",
  NEGOCIACAO: "Negociação",
  FECHADO: "Fechado",
  PERDIDO: "Perdido",
};

export const ROTULO_STATUS_VISITA: Record<string, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
  NAO_COMPARECEU: "Não compareceu",
};

export const ROTULO_PRIORIDADE: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const ROTULO_STATUS_TAREFA: Record<string, string> = {
  PENDENTE: "Pendente",
  CONCLUIDA: "Concluída",
};

export const ROTULO_STATUS_CAPTACAO: Record<string, string> = {
  PROSPECTADO: "Prospectado",
  CONTATO_REALIZADO: "Contato realizado",
  VISITA_CAPTACAO: "Visita de captação",
  DOCUMENTACAO: "Documentação",
  CONTRATO: "Contrato",
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
};

// --- Fase 4 ---------------------------------------------------------------

export const ROTULO_STATUS_PROPOSTA: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  EM_ANALISE: "Em análise",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
  EXPIRADA: "Expirada",
  CANCELADA: "Cancelada",
};

export const ROTULO_STATUS_LOCACAO: Record<string, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  RESCINDIDO: "Rescindido",
  INADIMPLENTE: "Inadimplente",
};

export const ROTULO_TIPO_CONTRATO: Record<string, string> = {
  ADMINISTRACAO: "Administração",
  LOCACAO: "Locação",
  COMPRA_VENDA: "Compra e venda",
  CAPTACAO: "Captação",
  PRESTACAO_SERVICOS: "Prestação de serviços",
};

export const ROTULO_STATUS_CONTRATO: Record<string, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  CANCELADO: "Cancelado",
};

// --- Fase 5 ---------------------------------------------------------------

export const ROTULO_TIPO_LANCAMENTO: Record<string, string> = {
  RECEBER: "A receber",
  PAGAR: "A pagar",
};

export const ROTULO_STATUS_LANCAMENTO: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

export const ROTULO_TIPO_COMISSAO: Record<string, string> = {
  CORRETOR_VENDEDOR: "Corretor vendedor",
  CORRETOR_CAPTADOR: "Corretor captador",
  GERENTE: "Gerente",
  IMOBILIARIA: "Imobiliária",
};

export const ROTULO_STATUS_COMISSAO: Record<string, string> = {
  PREVISTA: "Prevista",
  APROVADA: "Aprovada",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};
