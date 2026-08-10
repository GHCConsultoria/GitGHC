import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/formatacao";

export const dynamic = "force-dynamic";

export default async function Saude() {
  const [ultimaExecucao, publicacoesNaoIdentificadas, prazosPendentes, execucoesRecentes] = await Promise.all([
    prisma.execucaoCron.findFirst({ orderBy: { executadoEm: "desc" } }),
    prisma.publicacao.count({ where: { status: "NAO_IDENTIFICADA" } }),
    prisma.prazo.count({ where: { status: "PENDENTE_CONFIRMACAO" } }),
    prisma.execucaoCron.findMany({ orderBy: { executadoEm: "desc" }, take: 10 }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para a conferência de prazos
        </Link>
        <p className="eyebrow mt-6 mb-2">Operação</p>
        <h1 className="font-display text-4xl">Painel de saúde</h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          Status da automação diária — ingestão, cálculo de prazo e alertas.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metrica rotulo="Não identificadas (atual)" valor={publicacoesNaoIdentificadas} />
        <Metrica rotulo="Prazos pendentes (atual)" valor={prazosPendentes} />
        <Metrica rotulo="Publicações ingeridas (última execução)" valor={ultimaExecucao?.publicacoesNovas ?? "—"} />
        <Metrica
          rotulo="Prazos p/ revisão manual (última execução)"
          valor={ultimaExecucao?.prazosParaRevisaoManual ?? "—"}
        />
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Última execução do cron</h2>
        {ultimaExecucao ? (
          <div
            className={`paper-card rounded-sm border-l-[3px] p-5 text-sm ${
              ultimaExecucao.sucesso ? "border-l-calm-line" : "border-l-urgent-line"
            }`}
          >
            <p className="font-display text-lg">
              <span className={ultimaExecucao.sucesso ? "text-calm" : "text-urgent"}>
                {ultimaExecucao.sucesso ? "OK" : "Falhou"}
              </span>{" "}
              <span className="text-ink-faint">· {formatarDataHora(ultimaExecucao.executadoEm)}</span>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Item rotulo="Publicações encontradas" valor={ultimaExecucao.publicacoesEncontradas} />
              <Item rotulo="Publicações novas" valor={ultimaExecucao.publicacoesNovas} />
              <Item rotulo="Não identificadas" valor={ultimaExecucao.publicacoesNaoIdentificadas} />
              <Item rotulo="Prazos criados" valor={ultimaExecucao.prazosCriados} />
              <Item rotulo="P/ revisão manual" valor={ultimaExecucao.prazosParaRevisaoManual} />
            </dl>
            {ultimaExecucao.erro && (
              <p className="mt-4 rounded-sm border border-urgent-line/30 bg-urgent-bg/40 p-3 font-data text-xs text-urgent">
                {ultimaExecucao.erro}
              </p>
            )}
          </div>
        ) : (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            O cron ainda não rodou nenhuma vez neste ambiente.
          </p>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Histórico recente</h2>
        <ul className="flex flex-col text-sm">
          {execucoesRecentes.map((execucao) => (
            <li key={execucao.id} className="flex items-center justify-between border-b border-rule py-2.5">
              <span className="font-data text-ink-soft">{formatarDataHora(execucao.executadoEm)}</span>
              <span className={execucao.sucesso ? "text-calm" : "text-urgent"}>
                {execucao.sucesso ? "OK" : "Falhou"}
              </span>
              <span className="font-data text-ink-faint">
                {execucao.publicacoesNovas} novas · {execucao.prazosCriados} prazos
              </span>
            </li>
          ))}
          {execucoesRecentes.length === 0 && <li className="py-3 text-ink-faint">Sem execuções registradas.</li>}
        </ul>
      </section>
    </main>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="paper-card rounded-sm p-4">
      <p className="font-display text-3xl leading-none text-brass">{valor}</p>
      <p className="mt-2 text-xs leading-snug text-ink-soft">{rotulo}</p>
    </div>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <dt className="eyebrow mb-1">{rotulo}</dt>
      <dd className="font-data text-sm">{valor}</dd>
    </div>
  );
}
