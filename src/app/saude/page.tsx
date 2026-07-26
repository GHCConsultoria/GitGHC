import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatarDataHora(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export default async function Saude() {
  const [ultimaExecucao, publicacoesNaoIdentificadas, prazosPendentes, prazosParaRevisaoRecentes] =
    await Promise.all([
      prisma.execucaoCron.findFirst({ orderBy: { executadoEm: "desc" } }),
      prisma.publicacao.count({ where: { status: "NAO_IDENTIFICADA" } }),
      prisma.prazo.count({ where: { status: "PENDENTE_CONFIRMACAO" } }),
      prisma.execucaoCron.findMany({ orderBy: { executadoEm: "desc" }, take: 10 }),
    ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <header>
        <Link href="/" className="text-sm underline underline-offset-2">
          ← voltar para a conferência de prazos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Painel de saúde</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Status da automação diária (ingestão + cálculo de prazo + alertas).
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metrica rotulo="Não identificadas (atual)" valor={publicacoesNaoIdentificadas} />
        <Metrica rotulo="Prazos pendentes (atual)" valor={prazosPendentes} />
        <Metrica
          rotulo="Publicações ingeridas (última execução)"
          valor={ultimaExecucao?.publicacoesNovas ?? "—"}
        />
        <Metrica rotulo="Prazos p/ revisão manual (última execução)" valor={ultimaExecucao?.prazosParaRevisaoManual ?? "—"} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Última execução do cron</h2>
        {ultimaExecucao ? (
          <div
            className={`rounded-lg border-l-4 p-4 text-sm ${
              ultimaExecucao.sucesso
                ? "border-green-600 bg-green-50 dark:bg-green-950/30"
                : "border-red-500 bg-red-50 dark:bg-red-950/40"
            }`}
          >
            <p className="font-medium">
              {ultimaExecucao.sucesso ? "OK" : "Falhou"} · {formatarDataHora(ultimaExecucao.executadoEm)}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <Item rotulo="Publicações encontradas" valor={ultimaExecucao.publicacoesEncontradas} />
              <Item rotulo="Publicações novas" valor={ultimaExecucao.publicacoesNovas} />
              <Item rotulo="Não identificadas" valor={ultimaExecucao.publicacoesNaoIdentificadas} />
              <Item rotulo="Prazos criados" valor={ultimaExecucao.prazosCriados} />
              <Item rotulo="P/ revisão manual" valor={ultimaExecucao.prazosParaRevisaoManual} />
            </dl>
            {ultimaExecucao.erro && (
              <p className="mt-2 font-mono text-xs text-red-700 dark:text-red-300">{ultimaExecucao.erro}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">
            O cron ainda não rodou nenhuma vez neste ambiente.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Histórico recente</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {prazosParaRevisaoRecentes.map((execucao) => (
            <li key={execucao.id} className="flex justify-between border-b py-1">
              <span>{formatarDataHora(execucao.executadoEm)}</span>
              <span className={execucao.sucesso ? "text-green-700" : "text-red-700"}>
                {execucao.sucesso ? "OK" : "Falhou"}
              </span>
              <span className="text-black/60 dark:text-white/60">
                {execucao.publicacoesNovas} novas · {execucao.prazosCriados} prazos
              </span>
            </li>
          ))}
          {prazosParaRevisaoRecentes.length === 0 && (
            <li className="text-black/50 dark:text-white/50">Sem execuções registradas.</li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-2xl font-semibold">{valor}</p>
      <p className="text-xs text-black/60 dark:text-white/60">{rotulo}</p>
    </div>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div>
      <dt className="text-black/50 dark:text-white/50">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
