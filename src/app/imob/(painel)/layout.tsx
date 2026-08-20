import { redirect } from "next/navigation";
import { sairUsuarioImob } from "@/app/imob/login/actions";
import { SidebarImob } from "@/components/imob/SidebarImob";
import { obterSessaoImob, UsuarioImobNaoAutenticadoError, UsuarioImobNaoCadastradoError } from "@/lib/imob/auth";
import { filtrarNavegacao } from "@/lib/imob/navegacao";

export const dynamic = "force-dynamic";

/**
 * Casca do painel imobiliário autenticado (route group (painel) — não muda
 * URL). O middleware já barra quem não tem sessão Supabase; aqui tratamos
 * "com sessão mas sem UsuarioImob" (ex.: usuário de outro produto) e o desvio
 * para o onboarding enquanto a imobiliária não o concluiu.
 */
export default async function PainelImobLayout({ children }: { children: React.ReactNode }) {
  let sessao: Awaited<ReturnType<typeof obterSessaoImob>>;
  try {
    sessao = await obterSessaoImob();
  } catch (erro) {
    if (erro instanceof UsuarioImobNaoAutenticadoError || erro instanceof UsuarioImobNaoCadastradoError) {
      redirect("/imob/login");
    }
    throw erro;
  }

  if (!sessao.imobiliaria.onboardingConcluido) {
    redirect("/imob/onboarding");
  }

  const itens = filtrarNavegacao(sessao.papel.permissoes);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SidebarImob
        itens={itens}
        usuario={{ nome: sessao.nome, papel: sessao.papel.nome, imobiliaria: sessao.imobiliaria.nome }}
        acaoSair={sairUsuarioImob}
      />
      <div className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </div>
    </div>
  );
}
