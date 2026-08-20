import { type ColunaCsv, gerarCsv } from "@/lib/imob/csv";
import { prismaImob } from "@/lib/imob/prisma";
import { mapaClientes, mapaCorretores, mapaImoveis } from "@/lib/imob/resolvedores";
import {
  ROTULO_FINALIDADE,
  ROTULO_STATUS_IMOVEL,
  ROTULO_STATUS_LANCAMENTO,
  ROTULO_TIPO_IMOVEL,
  rotulo,
} from "@/lib/imob/rotulos";

/** Relatórios disponíveis (Fase 6). Cada um exporta CSV via gerarRelatorioCsv. */
export const RELATORIOS = [
  { tipo: "imoveis", nome: "Imóveis", permissao: "imoveis.ver" },
  { tipo: "vendas", nome: "Vendas", permissao: "vendas.ver" },
  { tipo: "locacoes", nome: "Locações", permissao: "locacoes.ver" },
  { tipo: "leads", nome: "Leads", permissao: "leads.ver" },
  { tipo: "comissoes", nome: "Comissões", permissao: "comissoes.ver" },
  { tipo: "financeiro", nome: "Financeiro", permissao: "financeiro.ver" },
] as const;

export type TipoRelatorio = (typeof RELATORIOS)[number]["tipo"];

export function ehTipoRelatorio(v: string): v is TipoRelatorio {
  return RELATORIOS.some((r) => r.tipo === v);
}

export function permissaoDoRelatorio(tipo: TipoRelatorio): string {
  return RELATORIOS.find((r) => r.tipo === tipo)?.permissao ?? "relatorios.ver";
}

/** centavos → "1234.56" (formato neutro para planilha). */
function reais(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2);
}
function data(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/** Gera o CSV de um relatório do tenant. Sempre filtrado por imobiliariaId. */
export async function gerarRelatorioCsv(
  imobiliariaId: string,
  tipo: TipoRelatorio,
): Promise<{ nome: string; csv: string }> {
  switch (tipo) {
    case "imoveis": {
      const linhas = await prismaImob.imovel.findMany({ where: { imobiliariaId }, orderBy: { codigo: "asc" } });
      const colunas: ColunaCsv<(typeof linhas)[number]>[] = [
        { cabecalho: "Código", valor: (l) => l.codigo },
        { cabecalho: "Título", valor: (l) => l.titulo },
        { cabecalho: "Tipo", valor: (l) => rotulo(ROTULO_TIPO_IMOVEL, l.tipo) },
        { cabecalho: "Finalidade", valor: (l) => rotulo(ROTULO_FINALIDADE, l.finalidade) },
        { cabecalho: "Status", valor: (l) => rotulo(ROTULO_STATUS_IMOVEL, l.status) },
        { cabecalho: "Cidade", valor: (l) => l.cidade ?? "" },
        { cabecalho: "Preço venda", valor: (l) => reais(l.precoVenda) },
        { cabecalho: "Preço aluguel", valor: (l) => reais(l.precoAluguel) },
      ];
      return { nome: "imoveis", csv: gerarCsv(linhas, colunas) };
    }
    case "vendas": {
      const linhas = await prismaImob.venda.findMany({ where: { imobiliariaId }, orderBy: { data: "desc" } });
      const imoveis = await mapaImoveis(
        imobiliariaId,
        linhas.map((l) => l.imovelId),
      );
      const clientes = await mapaClientes(
        imobiliariaId,
        linhas.map((l) => l.clienteId),
      );
      const corretores = await mapaCorretores(
        imobiliariaId,
        linhas.map((l) => l.corretorId),
      );
      const colunas: ColunaCsv<(typeof linhas)[number]>[] = [
        { cabecalho: "Data", valor: (l) => data(l.data) },
        { cabecalho: "Imóvel", valor: (l) => imoveis.get(l.imovelId)?.codigo ?? "" },
        { cabecalho: "Comprador", valor: (l) => (l.clienteId ? (clientes.get(l.clienteId) ?? "") : "") },
        { cabecalho: "Corretor", valor: (l) => (l.corretorId ? (corretores.get(l.corretorId) ?? "") : "") },
        { cabecalho: "Valor", valor: (l) => reais(l.valorVenda) },
        { cabecalho: "Comissão", valor: (l) => reais(l.comissaoValor) },
      ];
      return { nome: "vendas", csv: gerarCsv(linhas, colunas) };
    }
    case "locacoes": {
      const linhas = await prismaImob.locacao.findMany({ where: { imobiliariaId }, orderBy: { criadoEm: "desc" } });
      const imoveis = await mapaImoveis(
        imobiliariaId,
        linhas.map((l) => l.imovelId),
      );
      const clientes = await mapaClientes(
        imobiliariaId,
        linhas.map((l) => l.locatarioId),
      );
      const colunas: ColunaCsv<(typeof linhas)[number]>[] = [
        { cabecalho: "Imóvel", valor: (l) => imoveis.get(l.imovelId)?.codigo ?? "" },
        { cabecalho: "Locatário", valor: (l) => (l.locatarioId ? (clientes.get(l.locatarioId) ?? "") : "") },
        { cabecalho: "Aluguel", valor: (l) => reais(l.valorAluguel) },
        { cabecalho: "Início", valor: (l) => data(l.dataInicial) },
        { cabecalho: "Fim", valor: (l) => data(l.dataFinal) },
        { cabecalho: "Status", valor: (l) => l.status },
      ];
      return { nome: "locacoes", csv: gerarCsv(linhas, colunas) };
    }
    case "leads": {
      const linhas = await prismaImob.lead.findMany({ where: { imobiliariaId }, orderBy: { criadoEm: "desc" } });
      const colunas: ColunaCsv<(typeof linhas)[number]>[] = [
        { cabecalho: "Nome", valor: (l) => l.nome },
        { cabecalho: "Telefone", valor: (l) => l.telefone ?? "" },
        { cabecalho: "E-mail", valor: (l) => l.email ?? "" },
        { cabecalho: "Origem", valor: (l) => l.origem },
        { cabecalho: "Etapa", valor: (l) => l.etapa },
        { cabecalho: "Valor pretendido", valor: (l) => reais(l.valorPretendido) },
      ];
      return { nome: "leads", csv: gerarCsv(linhas, colunas) };
    }
    case "comissoes": {
      const linhas = await prismaImob.comissao.findMany({ where: { imobiliariaId }, orderBy: { criadoEm: "desc" } });
      const corretores = await mapaCorretores(
        imobiliariaId,
        linhas.map((l) => l.corretorId),
      );
      const colunas: ColunaCsv<(typeof linhas)[number]>[] = [
        { cabecalho: "Corretor", valor: (l) => (l.corretorId ? (corretores.get(l.corretorId) ?? "") : "") },
        { cabecalho: "Tipo", valor: (l) => l.tipo },
        { cabecalho: "Prevista", valor: (l) => reais(l.valorPrevisto) },
        { cabecalho: "Aprovada", valor: (l) => reais(l.valorAprovado) },
        { cabecalho: "Paga", valor: (l) => reais(l.valorPago) },
        { cabecalho: "Status", valor: (l) => l.status },
      ];
      return { nome: "comissoes", csv: gerarCsv(linhas, colunas) };
    }
    case "financeiro": {
      const linhas = await prismaImob.lancamentoFinanceiro.findMany({
        where: { imobiliariaId },
        orderBy: { vencimento: "desc" },
      });
      const colunas: ColunaCsv<(typeof linhas)[number]>[] = [
        { cabecalho: "Descrição", valor: (l) => l.descricao },
        { cabecalho: "Tipo", valor: (l) => (l.tipo === "RECEBER" ? "A receber" : "A pagar") },
        { cabecalho: "Categoria", valor: (l) => l.categoria ?? "" },
        { cabecalho: "Valor", valor: (l) => reais(l.valor) },
        { cabecalho: "Vencimento", valor: (l) => data(l.vencimento) },
        { cabecalho: "Pagamento", valor: (l) => data(l.pagamentoEm) },
        { cabecalho: "Status", valor: (l) => rotulo(ROTULO_STATUS_LANCAMENTO, l.status) },
      ];
      return { nome: "financeiro", csv: gerarCsv(linhas, colunas) };
    }
  }
}
