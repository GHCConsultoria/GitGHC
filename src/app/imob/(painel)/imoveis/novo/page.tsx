import Link from "next/link";
import { redirect } from "next/navigation";
import { ImovelForm } from "@/components/imob/ImovelForm";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarProprietariosParaSelecao } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function NovoImovelPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "imoveis.criar")) {
    redirect("/imob/imoveis");
  }
  const proprietarios = await listarProprietariosParaSelecao(sessao.imobiliariaId);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/imob/imoveis" className="text-sm text-ink-soft hover:underline">
          ← Imóveis
        </Link>
        <h1 className="font-display mt-1 text-3xl">Novo imóvel</h1>
      </header>
      <ImovelForm modo="novo" proprietarios={proprietarios} />
    </div>
  );
}
