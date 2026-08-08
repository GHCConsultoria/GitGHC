import Link from "next/link";
import type { ItemRisco, AlertaFeriadosNaoRevisados } from "@/lib/prazos/risco";
import { formatarDataCalendario } from "@/lib/formatacao";

const ROTULO_FLAG: Record<string, string> = {
  NAO_CONFIRMADO: "Não confirmado",
  SEM_TAREFA: "Sem tarefa",
  NAO_VISUALIZADO: "Alerta não visto",
};

/** "Modo paranoia jurídica" — tudo que deveria estar incomodando alguém, num só lugar. */
export function PainelRiscos({
  itens,
  alertasFeriados,
}: {
  itens: ItemRisco[];
  alertasFeriados: AlertaFeriadosNaoRevisados[];
}) {
  if (itens.length === 0 && alertasFeriados.length === 0) {
    return (
      <p className="paper-card rounded-sm px-5 py-6 text-center text-sm text-calm">
        Nenhum risco identificado no momento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alertasFeriados.map((alerta, indice) => (
        <div
          key={`${alerta.uf}-${alerta.ano}`}
          className="stagger-in rounded-sm border border-urgent-line/40 bg-urgent-bg px-4 py-3 text-sm text-urgent"
          style={{ "--stagger-index": indice } as React.CSSProperties}
        >
          Calendário de feriados de <strong>{alerta.uf}/{alerta.ano}</strong> ainda não foi revisado. Prazos desta
          UF podem ficar em revisão manual em vez de calculados. Revisão obrigatória em{" "}
          <Link href="/feriados" className="underline decoration-dotted">
            /feriados
          </Link>
          .
        </div>
      ))}

      {itens.map((item, indice) => (
        <article
          key={item.prazoId}
          className="stagger-in paper-card rounded-sm border-l-[3px] border-l-urgent-line p-4"
          style={{ "--stagger-index": alertasFeriados.length + indice } as React.CSSProperties}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">
                {item.cliente} <span className="font-normal text-ink-faint">· {item.numeroCnj}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {item.tipoAto} — data fatal <span className="font-data text-ink">{formatarDataCalendario(item.dataFatal)}</span>
              </p>
            </div>
            <Link
              href={`/publicacoes/${item.publicacaoId}`}
              className="text-xs text-ink-faint underline decoration-dotted transition-colors hover:text-brass"
            >
              Ver
            </Link>
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {item.flags.map((flag) => (
              <li
                key={flag.tipo}
                title={flag.mensagem}
                className="rounded-full border border-urgent-line/40 bg-urgent-bg px-2.5 py-0.5 text-xs text-urgent"
              >
                {ROTULO_FLAG[flag.tipo] ?? flag.tipo}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
