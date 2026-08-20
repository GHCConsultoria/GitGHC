import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessaoImob } from "@/lib/imob/auth";
import { agenda, type EventoAgenda } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

const NOMES_MES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const CORES_TIPO: Record<string, string> = {
  VISITA: "bg-brass/15 text-brass-deep",
  TAREFA: "bg-amber-100 text-amber-800",
  LEAD: "bg-paper text-ink-soft",
};

/** Deriva ano/mês do parâmetro ?mes=YYYY-MM (ou mês atual). */
function mesReferencia(param?: string): { ano: number; mes: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [ano, mes] = param.split("-").map(Number);
    return { ano, mes: mes - 1 };
  }
  const agora = new Date();
  return { ano: agora.getFullYear(), mes: agora.getMonth() };
}

function paramMes(ano: number, mes: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

export default async function AgendaPage({ searchParams }: { searchParams: { mes?: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "agenda.ver")) {
    redirect("/imob");
  }

  const { ano, mes } = mesReferencia(searchParams.mes);
  const inicio = new Date(ano, mes, 1, 0, 0, 0);
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59);
  const eventos = await agenda(sessao.imobiliariaId, inicio, fim);

  // agrupa por dia (chave = dia do mês em America/Sao_Paulo)
  const porDia = new Map<string, EventoAgenda[]>();
  for (const ev of eventos) {
    const chave = ev.data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave)?.push(ev);
  }

  const mesAnterior = new Date(ano, mes - 1, 1);
  const mesProximo = new Date(ano, mes + 1, 1);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Compromissos</p>
          <h1 className="font-display text-3xl capitalize">
            {NOMES_MES[mes]} de {ano}
          </h1>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/imob/agenda?mes=${paramMes(mesAnterior.getFullYear(), mesAnterior.getMonth())}`}
            className="rounded-sm border border-rule px-3 py-1.5 hover:bg-paper-raised"
          >
            ← Anterior
          </Link>
          <Link
            href={`/imob/agenda?mes=${paramMes(mesProximo.getFullYear(), mesProximo.getMonth())}`}
            className="rounded-sm border border-rule px-3 py-1.5 hover:bg-paper-raised"
          >
            Próximo →
          </Link>
        </div>
      </header>

      {eventos.length === 0 ? (
        <div className="paper-card rounded-md p-12 text-center text-sm text-ink-soft">
          Nenhum compromisso neste mês. Visitas, tarefas com prazo e follow-ups de leads aparecem aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(porDia.entries()).map(([dia, evs]) => (
            <section key={dia}>
              <h2 className="eyebrow mb-2">{dia}</h2>
              <ul className="flex flex-col gap-2">
                {evs.map((ev) => (
                  <li
                    key={`${ev.tipo}-${ev.data.getTime()}-${ev.titulo}`}
                    className="paper-card flex items-center gap-3 rounded-md p-3 text-sm"
                  >
                    <span className={`rounded-full px-2 py-0.5 text-xs ${CORES_TIPO[ev.tipo] ?? ""}`}>{ev.tipo}</span>
                    <span className="flex-1">
                      <Link href={ev.href} className="font-medium hover:underline">
                        {ev.titulo}
                      </Link>
                      {ev.detalhe && <span className="text-ink-soft"> · {ev.detalhe}</span>}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {ev.data.toLocaleTimeString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
