import Link from "next/link";
import { notFound } from "next/navigation";
import { PropostaStatusForm } from "@/components/imob/PropostaStatusForm";
import { obterSessaoImob } from "@/lib/imob/auth";
import { obterPropostaDoTenant } from "@/lib/imob/consultas-fin";
import { centavosParaReais, formatarData } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";
import { ROTULO_STATUS_PROPOSTA, rotulo } from "@/lib/imob/rotulos";

export const dynamic = "force-dynamic";

export default async function PropostaDetalhePage({ params }: { params: { id: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "propostas.ver")) {
    notFound();
  }
  const proposta = await obterPropostaDoTenant(sessao.imobiliariaId, params.id);
  if (!proposta) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/imob/propostas" className="text-sm text-ink-soft hover:underline">
        ← Propostas
      </Link>

      <section className="paper-card rounded-md p-6">
        <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
          {rotulo(ROTULO_STATUS_PROPOSTA, proposta.status)}
        </span>
        <h1 className="font-display mt-1 text-2xl">{centavosParaReais(proposta.valorProposto)}</h1>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <Dado rotulo="Valor solicitado" valor={centavosParaReais(proposta.valorSolicitado) || "—"} />
          <Dado rotulo="Entrada" valor={centavosParaReais(proposta.entrada) || "—"} />
          <Dado rotulo="Forma de pagamento" valor={proposta.formaPagamento || "—"} />
          <Dado rotulo="Financiamento" valor={proposta.financiamento ? "Sim" : "Não"} />
          <Dado rotulo="Permuta" valor={proposta.permuta ? "Sim" : "Não"} />
          <Dado rotulo="Validade" valor={proposta.validade ? formatarData(proposta.validade) : "—"} />
        </dl>
        {proposta.observacoes && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{proposta.observacoes}</p>
        )}
      </section>

      {temPermissao(sessao.papel.permissoes, "propostas.editar") && (
        <PropostaStatusForm propostaId={proposta.id} statusAtual={proposta.status} />
      )}

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-3">Histórico</p>
        <ul className="flex flex-col gap-3">
          {proposta.historico.map((h) => (
            <li key={h.id} className="rounded-sm border border-rule p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {h.statusAnterior ? `${rotulo(ROTULO_STATUS_PROPOSTA, h.statusAnterior)} → ` : ""}
                  {rotulo(ROTULO_STATUS_PROPOSTA, h.statusNovo)}
                </span>
                <span className="text-xs text-ink-faint">
                  {h.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
              </div>
              {h.observacao && <p className="mt-1 text-ink-soft">{h.observacao}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Dado({ rotulo: r, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{r}</p>
      <p>{valor}</p>
    </div>
  );
}
