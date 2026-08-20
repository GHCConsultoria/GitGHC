import { redirect } from "next/navigation";
import { obterSessaoImob } from "@/lib/imob/auth";
import { fluxoDeCaixaTenant } from "@/lib/imob/consultas-financeiro";
import { centavosParaReais } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function FluxoCaixaPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "financeiro.ver")) {
    redirect("/imob");
  }
  const { resumo, porMes } = await fluxoDeCaixaTenant(sessao.imobiliariaId);
  const maxMes = Math.max(1, ...porMes.map((m) => Math.max(m.entradas, m.saidas)));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Financeiro</p>
        <h1 className="font-display text-3xl">Fluxo de caixa</h1>
        <p className="mt-1 text-sm text-ink-soft">Regime de caixa — considera apenas lançamentos pagos.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao rotulo="Entradas" valor={centavosParaReais(resumo.entradas)} cor="text-brass-deep" />
        <Cartao rotulo="Saídas" valor={centavosParaReais(resumo.saidas)} cor="text-urgent" />
        <Cartao rotulo="Saldo" valor={centavosParaReais(resumo.saldoFinal)} />
        <Cartao
          rotulo="A receber / a pagar"
          valor={`${centavosParaReais(resumo.aReceber)} / ${centavosParaReais(resumo.aPagar)}`}
          pequeno
        />
      </section>

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-4">Entradas × saídas por mês</p>
        {porMes.length === 0 ? (
          <p className="text-sm text-ink-soft">Sem lançamentos pagos ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {porMes.map((m) => (
              <li key={m.mes} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span className="text-ink-soft">{m.mes}</span>
                  <span className="text-ink-faint">
                    +{centavosParaReais(m.entradas)} · -{centavosParaReais(m.saidas)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className="h-2 rounded-full bg-brass"
                    style={{ width: `${(m.entradas / maxMes) * 100}%`, minWidth: "2px" }}
                  />
                  <div
                    className="h-2 rounded-full bg-urgent"
                    style={{ width: `${(m.saidas / maxMes) * 100}%`, minWidth: "2px" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Cartao({ rotulo, valor, cor, pequeno }: { rotulo: string; valor: string; cor?: string; pequeno?: boolean }) {
  return (
    <div className="paper-card rounded-md p-5">
      <p className="eyebrow">{rotulo}</p>
      <p className={`font-display mt-2 ${pequeno ? "text-lg" : "text-2xl"} ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}
