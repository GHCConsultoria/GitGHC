import { redirect } from "next/navigation";
import { BuscaForm } from "@/components/imob/BuscaForm";
import { ProprietariosClient } from "@/components/imob/ProprietariosClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarProprietarios } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function ProprietariosPage({ searchParams }: { searchParams: { busca?: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "proprietarios.ver")) {
    redirect("/imob");
  }

  const proprietarios = await listarProprietarios(sessao.imobiliariaId, searchParams.busca);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1 className="font-display text-3xl">Proprietários</h1>
        </div>
        <BuscaForm action="/imob/proprietarios" valor={searchParams.busca} placeholder="Nome, documento, contato…" />
      </header>

      <ProprietariosClient
        podeCriar={temPermissao(sessao.papel.permissoes, "proprietarios.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "proprietarios.editar")}
        podeExcluir={temPermissao(sessao.papel.permissoes, "proprietarios.excluir")}
        proprietarios={proprietarios.map((p) => ({
          id: p.id,
          nome: p.nome,
          tipoPessoa: p.tipoPessoa,
          documento: p.documento,
          email: p.email,
          telefone: p.telefone,
          whatsapp: p.whatsapp,
          endereco: p.endereco,
          observacoes: p.observacoes,
          totalImoveis: p._count.imoveis,
        }))}
      />
    </div>
  );
}
