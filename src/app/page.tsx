import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarFilaPrazosPendentes, buscarProcessosParaVinculacao, buscarPublicacoesNaoIdentificadas } from "@/lib/prazos/fila";
import { PainelPrazos } from "@/components/prazos/PainelPrazos";
import { PainelNaoIdentificadas } from "@/components/prazos/PainelNaoIdentificadas";
import { sair } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
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
          <h1 className="text-lg font-semibold">Conta sem acesso</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Seu login foi reconhecido, mas não há um usuário cadastrado para você neste escritório. Peça para o
            administrador te cadastrar.
          </p>
        </main>
      );
    }
    throw erro;
  }

  const [itensFila, publicacoesNaoIdentificadas, processos] = await Promise.all([
    buscarFilaPrazosPendentes(usuario.escritorioId),
    buscarPublicacoesNaoIdentificadas(),
    buscarProcessosParaVinculacao(usuario.escritorioId),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 p-6 sm:p-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Conferência de publicações e prazos</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            O sistema propõe o prazo; a confirmação é sempre sua. Nada vira definitivo sem você clicar em Confirmar.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 whitespace-nowrap text-sm">
          <Link href="/saude" className="underline underline-offset-2">
            Painel de saúde
          </Link>
          <form action={sair}>
            <button type="submit" className="text-black/60 underline underline-offset-2 dark:text-white/60">
              Sair
            </button>
          </form>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          Prazos aguardando confirmação
          <span className="ml-2 text-sm font-normal text-black/50 dark:text-white/50">({itensFila.length})</span>
        </h2>
        <PainelPrazos itens={itensFila} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          Publicações não identificadas
          <span className="ml-2 text-sm font-normal text-black/50 dark:text-white/50">
            ({publicacoesNaoIdentificadas.length})
          </span>
        </h2>
        <p className="mb-3 text-sm text-black/60 dark:text-white/60">
          Publicações que a ingestão não conseguiu vincular a nenhum processo automaticamente. Vincule manualmente ou
          descarte.
        </p>
        <PainelNaoIdentificadas publicacoes={publicacoesNaoIdentificadas} processos={processos} />
      </section>
    </main>
  );
}
