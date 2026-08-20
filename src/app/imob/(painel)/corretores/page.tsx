import { redirect } from "next/navigation";
import { CorretoresClient } from "@/components/imob/CorretoresClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarCorretores } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function CorretoresPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "corretores.ver")) {
    redirect("/imob");
  }
  const corretores = await listarCorretores(sessao.imobiliariaId);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Equipe comercial</p>
        <h1 className="font-display text-3xl">Corretores</h1>
      </header>
      <CorretoresClient
        podeCriar={temPermissao(sessao.papel.permissoes, "corretores.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "corretores.editar")}
        podeExcluir={temPermissao(sessao.papel.permissoes, "corretores.excluir")}
        corretores={corretores.map((c) => ({
          id: c.id,
          nome: c.nome,
          cpf: c.cpf,
          creci: c.creci,
          email: c.email,
          telefone: c.telefone,
          whatsapp: c.whatsapp,
          metaMensal: c.metaMensal,
          percentualComissao: c.percentualComissao,
          ativo: c.ativo,
          leads: c._count.leads,
          visitas: c._count.visitas,
          captacoes: c._count.captacoes,
        }))}
      />
    </div>
  );
}
