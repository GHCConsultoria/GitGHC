import { redirect } from "next/navigation";
import { TarefasClient } from "@/components/imob/TarefasClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao, listarImoveisParaSelecao, listarUsuarios } from "@/lib/imob/consultas";
import { listarTarefas } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "tarefas.ver")) {
    redirect("/imob");
  }
  const [tarefas, usuarios, clientes, imoveis] = await Promise.all([
    listarTarefas(sessao.imobiliariaId),
    listarUsuarios(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Produtividade</p>
        <h1 className="font-display text-3xl">Tarefas</h1>
      </header>
      <TarefasClient
        podeCriar={temPermissao(sessao.papel.permissoes, "tarefas.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "tarefas.editar")}
        tarefas={tarefas.map((t) => ({
          id: t.id,
          titulo: t.titulo,
          descricao: t.descricao,
          prioridade: t.prioridade,
          prazo: t.prazo ? t.prazo.toISOString() : null,
          status: t.status,
        }))}
        opcoes={{
          usuarios: usuarios.map((u) => ({ id: u.id, nome: u.nome })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
        }}
      />
    </div>
  );
}
