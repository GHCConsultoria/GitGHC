import { redirect } from "next/navigation";
import { FinanceiroClient } from "@/components/imob/FinanceiroClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao, listarImoveisParaSelecao } from "@/lib/imob/consultas";
import { listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { listarLancamentos } from "@/lib/imob/consultas-financeiro";
import { centavosParaReais } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ searchParams }: { searchParams: { tipo?: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "financeiro.ver")) {
    redirect("/imob");
  }
  const tipo = searchParams.tipo === "RECEBER" || searchParams.tipo === "PAGAR" ? searchParams.tipo : "";
  const [lancamentos, clientes, imoveis, corretores] = await Promise.all([
    listarLancamentos(sessao.imobiliariaId, { tipo: tipo || undefined }),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
  ]);

  const aReceber = lancamentos
    .filter((l) => l.tipo === "RECEBER" && l.status === "PENDENTE")
    .reduce((s, l) => s + l.valor, 0);
  const aPagar = lancamentos
    .filter((l) => l.tipo === "PAGAR" && l.status === "PENDENTE")
    .reduce((s, l) => s + l.valor, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1 className="font-display text-3xl">Contas</h1>
        </div>
        <p className="text-sm text-ink-soft">
          A receber <strong className="text-ink">{centavosParaReais(aReceber)}</strong> · a pagar{" "}
          <strong className="text-urgent">{centavosParaReais(aPagar)}</strong>
        </p>
      </header>
      <FinanceiroClient
        podeCriar={temPermissao(sessao.papel.permissoes, "financeiro.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "financeiro.editar")}
        filtroAtual={tipo}
        lancamentos={lancamentos.map((l) => ({
          id: l.id,
          tipo: l.tipo,
          descricao: l.descricao,
          categoria: l.categoria,
          valor: l.valor,
          vencimento: l.vencimento.toISOString().slice(0, 10),
          status: l.status,
          vencido: l.vencido,
          formaPagamento: l.formaPagamento,
          centroCusto: l.centroCusto,
          clienteId: l.clienteId,
          imovelId: l.imovelId,
          contratoId: l.contratoId,
          corretorId: l.corretorId,
          clienteNome: l.clienteNome,
          imovelCodigo: l.imovelCodigo,
        }))}
        opcoes={{
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}
