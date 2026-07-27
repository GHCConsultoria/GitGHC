import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarFilaPrazosPendentes, buscarProcessosParaVinculacao, buscarPublicacoesNaoIdentificadas } from "@/lib/prazos/fila";
import { PainelPrazos } from "@/components/prazos/PainelPrazos";
import { PainelNaoIdentificadas } from "@/components/prazos/PainelNaoIdentificadas";
import { BotaoBuscarAgora } from "@/components/publicacoes/BotaoBuscarAgora";
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

  const [itensFila, publicacoesNaoIdentificadas, processos, escritorio] = await Promise.all([
    buscarFilaPrazosPendentes(usuario.escritorioId),
    buscarPublicacoesNaoIdentificadas(),
    buscarProcessosParaVinculacao(usuario.escritorioId),
    prisma.escritorio.findUniqueOrThrow({ where: { id: usuario.escritorioId } }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-14 px-6 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">GitGHC · Conferência de prazos</p>
          <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">
            Publicações <span className="italic text-ink-soft">&amp;</span> prazos
          </h1>
          <p className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft">
            O sistema propõe o prazo; a confirmação é sempre sua. Nada vira definitivo sem você clicar em{" "}
            <strong className="font-medium text-ink">Confirmar</strong>.
          </p>
        </div>
        <nav className="flex shrink-0 items-center gap-5 text-sm">
          <Link
            href="/escritorio"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Escritório
          </Link>
          <Link
            href="/processos"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Processos
          </Link>
          <Link
            href="/feriados"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Feriados
          </Link>
          <Link
            href="/usuarios"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Usuários
          </Link>
          <Link
            href="/saude"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Painel de saúde
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
            >
              Sair
            </button>
          </form>
        </nav>
      </header>

      <BotaoBuscarAgora oab={escritorio.oab.replace(/\D/g, "")} uf={escritorio.uf} />

      <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Aguardando confirmação</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(itensFila.length).padStart(2, "0")}
          </span>
        </div>
        <PainelPrazos itens={itensFila} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Não identificadas</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(publicacoesNaoIdentificadas.length).padStart(2, "0")}
          </span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-ink-soft">
          Publicações que a ingestão não conseguiu vincular a nenhum processo automaticamente. Vincule manualmente ou
          descarte.
        </p>
        <PainelNaoIdentificadas publicacoes={publicacoesNaoIdentificadas} processos={processos} />
      </section>
    </main>
  );
}
