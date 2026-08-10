import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { SidebarPrincipal } from "@/components/layout/SidebarPrincipal";
import { ChatAjuda } from "@/components/layout/ChatAjuda";
import { sair } from "@/app/login/actions";

export const dynamic = "force-dynamic";

/**
 * Casca comum de todo o painel autenticado (route group (painel), não altera
 * nenhuma URL): checa sessão uma única vez aqui em vez de em cada page.tsx,
 * e monta a sidebar fixa (vira menu deslizante no mobile — ver
 * SidebarPrincipal). /login, /cadastro, /nutri/** e /p/[token] ficam fora
 * deste grupo de propósito — não têm sidebar nem exigem esta sessão.
 */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  let usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) {
      redirect("/login");
    }
    if (erro instanceof UsuarioNaoCadastradoError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6 text-center">
          <p className="eyebrow">Conta sem acesso</p>
          <h1 className="font-display text-2xl">Seu login foi reconhecido, mas falta um cadastro</h1>
          <p className="text-sm text-ink-soft">
            Não há um usuário cadastrado para você neste escritório. Peça para o administrador te cadastrar.
          </p>
        </main>
      );
    }
    throw erro;
  }

  return (
    <>
      <SidebarPrincipal usuario={{ nome: usuario.nome, role: usuario.role }} acaoSair={sair} />
      <div className="lg:pl-60">{children}</div>
      <ChatAjuda />
    </>
  );
}
