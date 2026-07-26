import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { buscarFilaPrazosPendentes, buscarProcessosParaVinculacao, buscarPublicacoesNaoIdentificadas } from "@/lib/prazos/fila";
import { PainelPrazos } from "@/components/prazos/PainelPrazos";
import { PainelNaoIdentificadas } from "@/components/prazos/PainelNaoIdentificadas";

export const dynamic = "force-dynamic";

export default async function Home() {
  const usuario = await obterUsuarioAtual();

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
        <Link href="/saude" className="whitespace-nowrap text-sm underline underline-offset-2">
          Painel de saúde
        </Link>
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
