import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError } from "@/lib/auth";
import { paraDataCalendarioSaoPaulo } from "@/lib/prazos/calculo";
import { gerarRelatorioSeguranca } from "@/lib/relatorios/seguranca";
import { formatarDataCalendario, formatarDataHora } from "@/lib/formatacao";

export const dynamic = "force-dynamic";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_PADRAO = 30;

function paraChave(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Relatório de segurança: "nenhum prazo perdido no período", com a auditoria por trás pra provar. Layout pensado pra imprimir/compartilhar com o cliente. */
export default async function PaginaRelatorioSeguranca({
  searchParams,
}: {
  searchParams: { inicio?: string; fim?: string };
}) {
  let usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) redirect("/login");
    throw erro;
  }

  const hoje = paraDataCalendarioSaoPaulo(new Date());
  const fimPadrao = hoje;
  const inicioPadrao = new Date(hoje.getTime() - DIAS_PADRAO * MS_POR_DIA);

  const periodoInicio =
    searchParams.inicio && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.inicio)
      ? new Date(`${searchParams.inicio}T00:00:00.000Z`)
      : inicioPadrao;
  const periodoFim =
    searchParams.fim && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fim)
      ? new Date(`${searchParams.fim}T00:00:00.000Z`)
      : fimPadrao;

  const relatorio = await gerarRelatorioSeguranca(usuario.escritorioId, periodoInicio, periodoFim);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14 print:px-0 print:py-6">
      <header className="print:hidden">
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← Voltar
        </Link>
      </header>

      <div>
        <p className="eyebrow mb-1">Relatório de segurança</p>
        <h1 className="font-display text-3xl leading-tight">
          {formatarDataCalendario(periodoInicio)} a {formatarDataCalendario(periodoFim)}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Gerado em {formatarDataHora(new Date())}.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">De</span>
          <input
            type="date"
            name="inicio"
            defaultValue={paraChave(periodoInicio)}
            className="rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
          />
        </label>
        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">Até</span>
          <input
            type="date"
            name="fim"
            defaultValue={paraChave(periodoFim)}
            className="rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
          />
        </label>
        <button
          type="submit"
          className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90"
        >
          Atualizar
        </button>
      </form>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica rotulo="Prazos no período" valor={relatorio.totalPrazos} />
        <Metrica rotulo="Confirmados" valor={relatorio.confirmados} tom="calm" />
        <Metrica rotulo="Cumpridos" valor={relatorio.cumpridos} tom="calm" />
        <Metrica rotulo="Perdidos" valor={relatorio.perdidos} tom={relatorio.perdidos > 0 ? "urgent" : "calm"} />
      </section>

      <section
        className={`rounded-sm border p-5 ${
          relatorio.perdidos === 0 ? "border-calm-line/40 bg-calm-bg" : "border-urgent-line/40 bg-urgent-bg"
        }`}
      >
        <p className={`font-display text-xl ${relatorio.perdidos === 0 ? "text-calm" : "text-urgent"}`}>
          {relatorio.perdidos === 0
            ? "Nenhum prazo perdido no período."
            : `${relatorio.perdidos} prazo(s) perdido(s) no período.`}
        </p>
        <p className={`mt-2 text-sm ${relatorio.perdidos === 0 ? "text-calm" : "text-urgent"}`}>
          {relatorio.auditoriaCompleta
            ? `Todos os ${relatorio.confirmados} prazo(s) confirmado(s) ou cumprido(s) têm auditoria completa (autor e data de confirmação registrados).`
            : "Atenção: foram encontrados prazos confirmados sem auditoria completa. Isto não deveria acontecer; reporte ao suporte."}
        </p>
      </section>

      {relatorio.itensPerdidos.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Prazos perdidos</h2>
          <ul className="flex flex-col gap-2">
            {relatorio.itensPerdidos.map((item) => (
              <li key={item.id} className="paper-card rounded-sm border-l-[3px] border-l-urgent-line p-3.5 text-sm">
                <p className="font-medium text-ink">
                  {item.cliente} <span className="font-normal text-ink-faint">· {item.numeroCnj}</span>
                </p>
                <p className="mt-0.5 text-ink-soft">
                  {item.tipoAto} · venceu em <span className="font-data">{formatarDataCalendario(item.dataFatal)}</span>{" "}
                  sem confirmação
                </p>
                <Link
                  href={`/publicacoes/${item.publicacaoId}`}
                  className="mt-1 inline-block text-xs text-ink-faint underline decoration-dotted hover:text-brass print:hidden"
                >
                  Ver central da publicação
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 text-sm text-ink-soft sm:grid-cols-3">
        <p>
          Pendentes dentro do prazo: <span className="font-data text-ink">{relatorio.pendentesDentroDoPrazo}</span>
        </p>
        <p>
          Descartados: <span className="font-data text-ink">{relatorio.descartados}</span>
        </p>
      </section>

      <p className="text-xs text-ink-faint print:hidden">
        Métricas recalculadas a partir do banco a cada geração. Nunca armazenadas ou estimadas.
      </p>
    </main>
  );
}

function Metrica({ rotulo, valor, tom }: { rotulo: string; valor: number; tom?: "calm" | "urgent" }) {
  const cor = tom === "urgent" ? "text-urgent" : tom === "calm" ? "text-calm" : "text-ink";
  return (
    <div className="paper-card rounded-sm p-4 text-center">
      <p className={`font-display text-3xl ${cor}`}>{valor}</p>
      <p className="eyebrow mt-1">{rotulo}</p>
    </div>
  );
}
