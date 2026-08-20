import { redirect } from "next/navigation";
import { ConfiguracoesForm } from "@/components/imob/ConfiguracoesForm";
import { obterSessaoImob } from "@/lib/imob/auth";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "configuracoes.ver")) {
    redirect("/imob");
  }

  const i = sessao.imobiliaria;
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Imobiliária</p>
        <h1 className="font-display text-3xl">Configurações</h1>
      </header>
      <ConfiguracoesForm
        somenteLeitura={!temPermissao(sessao.papel.permissoes, "configuracoes.editar")}
        valores={{
          nome: i.nome,
          cnpj: i.cnpj ?? "",
          creci: i.creci ?? "",
          email: i.email ?? "",
          telefone: i.telefone ?? "",
          cep: i.cep ?? "",
          logradouro: i.logradouro ?? "",
          numero: i.numero ?? "",
          complemento: i.complemento ?? "",
          bairro: i.bairro ?? "",
          cidade: i.cidade ?? "",
          estado: i.estado ?? "",
          corPrimaria: i.corPrimaria,
        }}
      />
    </div>
  );
}
