import { redirect } from "next/navigation";
import { BuscaForm } from "@/components/imob/BuscaForm";
import { ClientesClient } from "@/components/imob/ClientesClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientes } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function ClientesPage({ searchParams }: { searchParams: { busca?: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "clientes.ver")) {
    redirect("/imob");
  }

  const clientes = await listarClientes(sessao.imobiliariaId, searchParams.busca);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1 className="font-display text-3xl">Clientes</h1>
        </div>
        <BuscaForm action="/imob/clientes" valor={searchParams.busca} placeholder="Nome, documento, contato…" />
      </header>

      <ClientesClient
        podeCriar={temPermissao(sessao.papel.permissoes, "clientes.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "clientes.editar")}
        podeExcluir={temPermissao(sessao.papel.permissoes, "clientes.excluir")}
        clientes={clientes.map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          tipoPessoa: c.tipoPessoa,
          documento: c.documento,
          email: c.email,
          telefone: c.telefone,
          whatsapp: c.whatsapp,
          dataNascimento: c.dataNascimento ? c.dataNascimento.toISOString().slice(0, 10) : null,
          profissao: c.profissao,
          estadoCivil: c.estadoCivil,
          endereco: c.endereco,
          observacoes: c.observacoes,
          prefTipoImovel: c.prefTipoImovel,
          prefFinalidade: c.prefFinalidade,
          prefValorMin: c.prefValorMin,
          prefValorMax: c.prefValorMax,
          prefCidade: c.prefCidade,
          prefBairro: c.prefBairro,
          prefQuartos: c.prefQuartos,
          prefSuites: c.prefSuites,
          prefVagas: c.prefVagas,
          prefAreaMinima: c.prefAreaMinima,
        }))}
      />
    </div>
  );
}
