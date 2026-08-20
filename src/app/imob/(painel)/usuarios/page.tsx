import { redirect } from "next/navigation";
import { UsuariosClient } from "@/components/imob/UsuariosClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarPapeis, listarUsuarios } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "usuarios.ver")) {
    redirect("/imob");
  }

  const [usuarios, papeis] = await Promise.all([
    listarUsuarios(sessao.imobiliariaId),
    listarPapeis(sessao.imobiliariaId),
  ]);

  return (
    <UsuariosClient
      podeCriar={temPermissao(sessao.papel.permissoes, "usuarios.criar")}
      podeEditar={temPermissao(sessao.papel.permissoes, "usuarios.editar")}
      usuarioAtualId={sessao.id}
      usuarios={usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        telefone: u.telefone,
        status: u.status,
        papelId: u.papelId,
        papelNome: u.papel.nome,
        ultimoAcessoEm: u.ultimoAcessoEm ? u.ultimoAcessoEm.toISOString() : null,
      }))}
      papeis={papeis.map((p) => ({ id: p.id, nome: p.nome }))}
    />
  );
}
