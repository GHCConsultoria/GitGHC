import { redirect } from "next/navigation";
import { VisitasClient } from "@/components/imob/VisitasClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao, listarImoveisParaSelecao } from "@/lib/imob/consultas";
import { listarCorretoresParaSelecao, listarVisitas } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function VisitasPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "visitas.ver")) {
    redirect("/imob");
  }
  const [visitas, imoveis, clientes, corretores] = await Promise.all([
    listarVisitas(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Agenda comercial</p>
        <h1 className="font-display text-3xl">Visitas</h1>
      </header>
      <VisitasClient
        podeCriar={temPermissao(sessao.papel.permissoes, "visitas.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "visitas.editar")}
        visitas={visitas.map((v) => ({
          id: v.id,
          data: v.data.toISOString(),
          status: v.status,
          imovelCodigo: v.imovelCodigo,
          imovelTitulo: v.imovelTitulo,
          clienteNome: v.clienteNome,
          corretorNome: v.corretor?.nome ?? null,
          interesse: v.interesse,
          nota: v.nota,
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
