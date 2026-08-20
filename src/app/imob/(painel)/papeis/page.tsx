import { redirect } from "next/navigation";
import { PapeisClient } from "@/components/imob/PapeisClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarPapeis } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function PapeisPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "papeis.ver")) {
    redirect("/imob");
  }

  const papeis = await listarPapeis(sessao.imobiliariaId);

  return (
    <PapeisClient
      podeCriar={temPermissao(sessao.papel.permissoes, "papeis.criar")}
      podeEditar={temPermissao(sessao.papel.permissoes, "papeis.editar")}
      papeis={papeis.map((p) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        sistema: p.sistema,
        permissoes: p.permissoes,
        totalUsuarios: p._count.usuarios,
      }))}
    />
  );
}
