import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/imob/OnboardingWizard";
import { obterSessaoImob, UsuarioImobNaoAutenticadoError, UsuarioImobNaoCadastradoError } from "@/lib/imob/auth";

export const dynamic = "force-dynamic";

/**
 * Onboarding da imobiliária recém-criada. Fica fora do grupo (painel) porque
 * o layout do painel redireciona pra cá enquanto o onboarding não terminou —
 * mantê-lo no mesmo grupo criaria um laço de redirecionamento.
 */
export default async function OnboardingPage() {
  let sessao: Awaited<ReturnType<typeof obterSessaoImob>>;
  try {
    sessao = await obterSessaoImob();
  } catch (erro) {
    if (erro instanceof UsuarioImobNaoAutenticadoError || erro instanceof UsuarioImobNaoCadastradoError) {
      redirect("/imob/login");
    }
    throw erro;
  }

  if (sessao.imobiliaria.onboardingConcluido) {
    redirect("/imob");
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-lg px-4 py-12 sm:py-16">
        <OnboardingWizard nomeImobiliaria={sessao.imobiliaria.nome} corPrimaria={sessao.imobiliaria.corPrimaria} />
      </div>
    </main>
  );
}
