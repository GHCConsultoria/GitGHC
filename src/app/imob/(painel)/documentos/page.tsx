import { redirect } from "next/navigation";
import { DocumentosClient } from "@/components/imob/DocumentosClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import {
  listarClientesParaSelecao,
  listarImoveisParaSelecao,
  listarProprietariosParaSelecao,
} from "@/lib/imob/consultas";
import { listarDocumentos } from "@/lib/imob/consultas-conteudo";
import { listarContratosParaSelecao } from "@/lib/imob/consultas-fin";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "documentos.ver")) {
    redirect("/imob");
  }
  const [documentos, clientes, proprietarios, imoveis, contratos] = await Promise.all([
    listarDocumentos(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarProprietariosParaSelecao(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarContratosParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Central</p>
        <h1 className="font-display text-3xl">Documentos</h1>
      </header>
      <DocumentosClient
        podeCriar={temPermissao(sessao.papel.permissoes, "documentos.criar")}
        podeExcluir={temPermissao(sessao.papel.permissoes, "documentos.excluir")}
        documentos={documentos.map((d) => ({
          id: d.id,
          nome: d.nome,
          tipo: d.tipo,
          url: d.url,
          validade: d.validade ? d.validade.toISOString().slice(0, 10) : null,
          vinculoNome: d.vinculoNome,
        }))}
        opcoes={{
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          proprietarios: proprietarios.map((p) => ({ id: p.id, nome: p.nome })),
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          contratos: contratos.map((c) => ({ id: c.id, nome: c.titulo })),
        }}
      />
    </div>
  );
}
