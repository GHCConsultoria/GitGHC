import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import {
  buscarFilaPrazosPendentes,
  buscarPrazosConfirmadosRecentes,
  buscarProcessosParaVinculacao,
  buscarPublicacoesNaoIdentificadas,
  buscarPublicacoesVinculadasSemPrazo,
} from "@/lib/prazos/fila";
import { buscarPrazosParaDashboard } from "@/lib/prazos/dashboard";
import { calcularRiscos, buscarAlertasFeriadosNaoRevisados } from "@/lib/prazos/risco";
import { buscarUsuariosDoEscritorio } from "@/lib/usuarios/consultas";
import { podeConfirmarPrazos } from "@/lib/permissoes";
import { PainelDashboard } from "@/components/prazos/PainelDashboard";
import { PainelRiscos } from "@/components/prazos/PainelRiscos";
import { PainelPrazos } from "@/components/prazos/PainelPrazos";
import { PainelNaoIdentificadas } from "@/components/prazos/PainelNaoIdentificadas";
import { PainelConfirmados } from "@/components/prazos/PainelConfirmados";
import { PainelSemClassificacao } from "@/components/prazos/PainelSemClassificacao";
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

  const [
    itensFila,
    publicacoesNaoIdentificadas,
    processos,
    escritorio,
    prazosConfirmados,
    itensDashboard,
    usuarios,
    publicacoesSemPrazo,
    tiposAtoPrazo,
    itensRisco,
    alertasFeriados,
  ] = await Promise.all([
    buscarFilaPrazosPendentes(usuario.escritorioId),
    buscarPublicacoesNaoIdentificadas(),
    buscarProcessosParaVinculacao(usuario.escritorioId),
    prisma.escritorio.findUniqueOrThrow({ where: { id: usuario.escritorioId } }),
    buscarPrazosConfirmadosRecentes(usuario.escritorioId),
    buscarPrazosParaDashboard(usuario.escritorioId),
    buscarUsuariosDoEscritorio(usuario.escritorioId),
    buscarPublicacoesVinculadasSemPrazo(usuario.escritorioId),
    prisma.tipoAtoPrazo.findMany({ orderBy: { tipoAto: "asc" } }),
    calcularRiscos(usuario.escritorioId),
    buscarAlertasFeriadosNaoRevisados(usuario.escritorioId),
  ]);
  const usuariosSelecionaveis = usuarios.map((u) => ({ id: u.id, nome: u.nome }));
  const podeConfirmar = podeConfirmarPrazos(usuario);
  // Sinal de risco (Nível 2 — "modo paranoia jurídica") sobreposto direto nos
  // cards do dashboard e da fila, pra não depender só da seção separada de
  // Riscos pra alguém perceber que um prazo perto do vencimento também está
  // sem tarefa, sem confirmação ou sem ninguém ter visto o alerta. Array (não
  // Set) porque isto atravessa a fronteira server -> client component.
  const riscoPrazoIds = itensRisco.map((item) => item.prazoId);

  return (
    <>
      <nav className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 text-sm sm:px-10">
          <span className="eyebrow mr-2 shrink-0 text-ink">GitGHC</span>
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
            href="/agenda"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Agenda
          </Link>
          <Link
            href="/relatorios/seguranca"
            className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Relatório
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
          <form action={sair} className="ml-auto">
            <button
              type="submit"
              className="border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink"
            >
              Sair
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-14 px-6 py-10 sm:px-10 sm:py-14">
        <header>
          <p className="eyebrow mb-3">GitGHC · Conferência de prazos</p>
          <h1 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">
            Publicações <span className="italic text-ink-soft">&amp;</span> prazos
          </h1>
          <p className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft">
            O sistema propõe o prazo; a confirmação é sempre sua. Nada vira definitivo sem você clicar em{" "}
            <strong className="font-medium text-ink">Confirmar</strong>.
          </p>
        </header>

        <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Riscos</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(itensRisco.length + alertasFeriados.length).padStart(2, "0")}
          </span>
        </div>
        <PainelRiscos itens={itensRisco} alertasFeriados={alertasFeriados} />
      </section>

      <BotaoBuscarAgora oab={escritorio.oab.replace(/\D/g, "")} uf={escritorio.uf} />

      <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Painel de controle</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(itensDashboard.length).padStart(2, "0")}
          </span>
        </div>
        <PainelDashboard itens={itensDashboard} usuarios={usuariosSelecionaveis} riscoPrazoIds={riscoPrazoIds} />
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Aguardando confirmação</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(itensFila.length).padStart(2, "0")}
          </span>
        </div>
        <PainelPrazos
          itens={itensFila}
          usuarios={usuariosSelecionaveis}
          podeConfirmar={podeConfirmar}
          riscoPrazoIds={riscoPrazoIds}
        />
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

      <section>
        <div className="mb-3 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Sem tipo de ato identificado</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(publicacoesSemPrazo.length).padStart(2, "0")}
          </span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-ink-soft">
          Publicações já vinculadas a um processo, mas cujo tipo de ato a classificação automática não reconheceu. A
          IA sugere; você decide.
        </p>
        <PainelSemClassificacao publicacoes={publicacoesSemPrazo} tiposDisponiveis={tiposAtoPrazo} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Confirmados</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(prazosConfirmados.length).padStart(2, "0")}
          </span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-ink-soft">
          Rascunho inicial de petição via IA, a partir do prazo confirmado — sempre um ponto de partida pra revisão,
          nunca protocolado automaticamente.
        </p>
        <PainelConfirmados prazos={prazosConfirmados} usuarios={usuariosSelecionaveis} podeConfirmar={podeConfirmar} />
        </section>
      </main>
    </>
  );
}
