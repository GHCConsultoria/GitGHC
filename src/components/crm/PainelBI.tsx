import type { DiaComVisitas } from "@/lib/crm/atividade";
import type { DegrauFunil, DesempenhoNicho, MetricasComerciais, MotivoRanking } from "@/lib/crm/funil";
import { formatarMoeda } from "@/lib/crm/moeda";

// Painel de BI comercial: cartões de indicadores + funil + série de visitas +
// ranking de motivos de perda + desempenho por nicho. Componente de servidor,
// puramente apresentacional — recebe números já agregados (ver src/lib/crm).
// Gráficos em CSS/flex com os tokens do design system, sem lib externa.

const TOM_BARRA: Record<DegrauFunil["tom"], string> = {
  neutro: "bg-ink-faint",
  andamento: "bg-attention",
  quente: "bg-brass",
  ganho: "bg-calm",
  perda: "bg-urgent",
};

function Cartao({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="paper-card rounded-sm p-4">
      <p className="eyebrow mb-1.5 truncate">{rotulo}</p>
      <p className="font-display text-2xl font-semibold tabular-nums text-ink">{valor}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

function diaCurto(iso: string): string {
  // "2026-08-14" -> "14/08"
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function PainelBI({
  metricas,
  funil,
  visitas,
  motivos,
  nichos,
}: {
  metricas: MetricasComerciais;
  funil: DegrauFunil[];
  visitas: DiaComVisitas[];
  motivos: MotivoRanking[];
  nichos: DesempenhoNicho[];
}) {
  const maxFunil = Math.max(1, ...funil.map((d) => d.quantidadeAlcancou));
  const maxVisitas = Math.max(1, ...visitas.map((d) => d.quantidade));
  const totalVisitas = visitas.reduce((s, d) => s + d.quantidade, 0);
  const maxMotivo = Math.max(1, ...motivos.map((m) => m.quantidade));

  return (
    <div className="flex flex-col gap-8">
      {/* Indicadores rápidos */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao rotulo="Leads ativos" valor={String(metricas.emAberto)} sub={`${metricas.total} no total`} />
        <Cartao
          rotulo="Taxa de conversão"
          valor={metricas.taxaConversao === null ? "—" : `${metricas.taxaConversao}%`}
          sub={`${metricas.ganhos} ganhos · ${metricas.perdidos} perdidos`}
        />
        <Cartao
          rotulo="Vendas fechadas"
          valor={formatarMoeda(metricas.valorGanhoCentavos)}
          sub={
            metricas.ticketMedioCentavos === null
              ? undefined
              : `ticket médio ${formatarMoeda(metricas.ticketMedioCentavos)}`
          }
        />
        <Cartao
          rotulo="Pipeline em aberto"
          valor={formatarMoeda(metricas.valorEmAbertoCentavos)}
          sub="valor potencial"
        />
      </div>

      {/* Funil */}
      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Funil de prospecção</h2>
        {metricas.total === 0 ? (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            Nenhum lead ainda — o funil aparece assim que você cadastrar o primeiro.
          </p>
        ) : (
          <div className="paper-card flex flex-col gap-2.5 rounded-sm p-5">
            {funil.map((degrau) => (
              <div key={degrau.estagio} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs text-ink-soft">{degrau.rotulo}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-sm bg-paper">
                  <div
                    className={`flex h-full items-center rounded-sm ${TOM_BARRA[degrau.tom]}`}
                    style={{ width: `${Math.max(4, (degrau.quantidadeAlcancou / maxFunil) * 100)}%` }}
                  >
                    <span className="px-2 text-xs font-semibold tabular-nums text-brass-on mix-blend-luminosity">
                      {degrau.quantidadeAlcancou}
                    </span>
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-ink-faint tabular-nums">
                  {degrau.quantidadeNoEstagio} aqui
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Visitas por dia */}
        <section>
          <h2 className="eyebrow mb-4 rule pt-6">
            Visitas — últimos {visitas.length} dias
            <span className="ml-2 font-data text-ink-faint">({totalVisitas})</span>
          </h2>
          <div className="paper-card rounded-sm p-5">
            <div className="flex h-40 items-end gap-1">
              {visitas.map((d) => (
                <div
                  key={d.dia}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${diaCurto(d.dia)}: ${d.quantidade}`}
                >
                  <span className="text-[10px] text-ink-faint tabular-nums">
                    {d.quantidade > 0 ? d.quantidade : ""}
                  </span>
                  <div
                    className="w-full rounded-sm bg-brass"
                    style={{ height: `${d.quantidade === 0 ? 2 : Math.max(6, (d.quantidade / maxVisitas) * 120)}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
              <span>{visitas[0] ? diaCurto(visitas[0].dia) : ""}</span>
              <span>{visitas.length > 0 ? diaCurto(visitas[visitas.length - 1].dia) : ""}</span>
            </div>
          </div>
        </section>

        {/* Motivos de perda */}
        <section>
          <h2 className="eyebrow mb-4 rule pt-6">Por que perdemos</h2>
          {motivos.length === 0 ? (
            <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
              Nenhuma perda registrada ainda.
            </p>
          ) : (
            <div className="paper-card flex flex-col gap-2.5 rounded-sm p-5">
              {motivos.map((m) => (
                <div key={m.motivo} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-xs text-ink-soft" title={m.motivo}>
                    {m.motivo}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-paper">
                    <div
                      className="h-full rounded-sm bg-urgent"
                      style={{ width: `${Math.max(4, (m.quantidade / maxMotivo) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-ink-faint tabular-nums">{m.quantidade}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Desempenho por nicho */}
      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Desempenho por nicho</h2>
        {nichos.length === 0 ? (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            Sem dados por nicho ainda.
          </p>
        ) : (
          <div className="paper-card overflow-x-auto rounded-sm">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-ink-faint">
                  <th className="px-4 py-2 font-medium">Nicho</th>
                  <th className="px-4 py-2 text-right font-medium">Leads</th>
                  <th className="px-4 py-2 text-right font-medium">Ganhos</th>
                  <th className="px-4 py-2 text-right font-medium">Conversão</th>
                  <th className="px-4 py-2 text-right font-medium">Vendas</th>
                </tr>
              </thead>
              <tbody>
                {nichos.map((n) => (
                  <tr key={n.nicho} className="border-b border-rule/60 last:border-0">
                    <td className="px-4 py-2 text-ink">{n.nicho}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-soft">{n.total}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-soft">{n.ganhos}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-soft">
                      {n.taxaConversao === null ? "—" : `${n.taxaConversao}%`}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-soft">
                      {formatarMoeda(n.valorGanhoCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
