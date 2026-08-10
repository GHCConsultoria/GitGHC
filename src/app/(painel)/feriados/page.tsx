import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarFeriadosDoAno, buscarRevisao } from "@/lib/feriados/consultas";
import { UFS_BRASIL, ehUfValida } from "@/lib/br/ufs";
import { FormularioAdicionarFeriado } from "@/components/feriados/FormularioAdicionarFeriado";
import { BotaoMarcarRevisado } from "@/components/feriados/BotaoMarcarRevisado";
import { formatarDataCalendario } from "@/lib/formatacao";

export const dynamic = "force-dynamic";

const ROTULO_TIPO: Record<string, string> = {
  FERIADO: "Feriado",
  SUSPENSAO: "Suspensão",
  RECESSO: "Recesso",
};

export default async function Feriados({
  searchParams,
}: {
  searchParams: { uf?: string; ano?: string };
}) {
  try {
    await obterUsuarioAtual();
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

  const uf = ehUfValida(searchParams.uf) ? searchParams.uf : "SP";
  const anoAtual = new Date().getFullYear();
  const anoNumero = Number(searchParams.ano);
  const ano = Number.isFinite(anoNumero) && searchParams.ano ? anoNumero : anoAtual;
  const anosDisponiveis = [anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2];

  const [feriados, revisao] = await Promise.all([buscarFeriadosDoAno(uf, ano), buscarRevisao(uf, ano)]);
  const revisado = revisao?.revisado ?? false;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para a conferência de prazos
        </Link>
        <p className="eyebrow mt-6 mb-2">Calendário forense</p>
        <h1 className="font-display text-4xl">Revisão de feriados</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          O motor de prazo só calcula automaticamente para uma UF/ano depois que alguém revisar o calendário aqui.
          Sem isso, tudo vai para revisão manual.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3" action="/feriados" method="GET">
        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">UF</span>
          <select
            name="uf"
            defaultValue={uf}
            className="rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
          >
            {UFS_BRASIL.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">Ano</span>
          <select
            name="ano"
            defaultValue={String(ano)}
            className="rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
          >
            {anosDisponiveis.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm border border-rule px-4 py-2 text-sm text-ink transition-colors hover:border-ink-faint"
        >
          Ver
        </button>
      </form>

      <section>
        <div
          className={`paper-card flex flex-wrap items-center justify-between gap-4 rounded-sm border-l-[3px] p-5 ${
            revisado ? "border-l-calm-line" : "border-l-urgent-line"
          }`}
        >
          <div>
            <p className="eyebrow mb-1">
              {uf} · {ano}
            </p>
            <p className={`font-display text-xl ${revisado ? "text-calm" : "text-urgent"}`}>
              {revisado ? "Calendário revisado" : "Ainda não revisado"}
            </p>
          </div>
          <BotaoMarcarRevisado uf={uf} ano={ano} revisadoAtual={revisado} />
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">
          Feriados cadastrados <span className="text-ink-faint">({feriados.length})</span>
        </h2>
        {feriados.length === 0 ? (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            Nenhum feriado cadastrado para {uf}/{ano}.
          </p>
        ) : (
          <ul className="paper-card flex flex-col divide-y divide-rule rounded-sm">
            {feriados.map((feriado) => (
              <li key={feriado.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p>{feriado.descricao}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{feriado.tribunal ?? "estadual (todos os tribunais)"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 whitespace-nowrap font-data text-xs text-ink-soft">
                  <span>{ROTULO_TIPO[feriado.tipo] ?? feriado.tipo}</span>
                  <span>{formatarDataCalendario(feriado.data)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Adicionar feriado/suspensão</h2>
        <FormularioAdicionarFeriado ufPadrao={uf} />
      </section>
    </main>
  );
}
