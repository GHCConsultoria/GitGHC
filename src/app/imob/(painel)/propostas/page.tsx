import { redirect } from "next/navigation";
import { PropostasClient } from "@/components/imob/PropostasClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao, listarImoveisParaSelecao } from "@/lib/imob/consultas";
import { listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { listarPropostas } from "@/lib/imob/consultas-fin";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "propostas.ver")) {
    redirect("/imob");
  }
  const [propostas, imoveis, clientes, corretores] = await Promise.all([
    listarPropostas(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Negociação</p>
        <h1 className="font-display text-3xl">Propostas</h1>
      </header>
      <PropostasClient
        podeCriar={temPermissao(sessao.papel.permissoes, "propostas.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "propostas.editar")}
        propostas={propostas.map((p) => ({
          id: p.id,
          imovelId: p.imovelId,
          clienteId: p.clienteId,
          corretorId: p.corretorId,
          valorProposto: p.valorProposto,
          valorSolicitado: p.valorSolicitado,
          formaPagamento: p.formaPagamento,
          entrada: p.entrada,
          financiamento: p.financiamento,
          permuta: p.permuta,
          validade: p.validade ? p.validade.toISOString().slice(0, 10) : null,
          observacoes: p.observacoes,
          status: p.status,
          data: p.data.toISOString(),
          imovelCodigo: p.imovelCodigo,
          clienteNome: p.clienteNome,
        }))}
        opcoes={{
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}
