"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LeadForm, type OpcoesLead } from "@/components/imob/LeadForm";
import { CLASSE_BOTAO_PRIMARIO } from "@/components/imob/primitivos";
import { moverLead } from "@/lib/imob/acoes-crm";
import { centavosParaReais } from "@/lib/imob/formato";
import { ROTULO_ETAPA_LEAD, ROTULO_ORIGEM_LEAD } from "@/lib/imob/rotulos";

export interface LeadCardView {
  id: string;
  nome: string;
  etapa: string;
  origem: string;
  telefone: string | null;
  valorPretendido: number | null;
  corretorNome: string | null;
  imovelCodigo: string | null;
}

interface Props {
  etapas: string[];
  colunas: Record<string, LeadCardView[]>;
  podeCriar: boolean;
  podeEditar: boolean;
  opcoes: OpcoesLead;
}

export function KanbanLeads({ etapas, colunas, podeCriar, podeEditar, opcoes }: Props) {
  const [criando, setCriando] = useState(false);
  const [pending, start] = useTransition();

  function mover(leadId: string, etapa: string) {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("etapa", etapa);
    start(async () => {
      await moverLead(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setCriando(true)} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo lead
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {etapas.map((etapa) => {
          const cards = colunas[etapa] ?? [];
          return (
            <div key={etapa} className="flex w-64 shrink-0 flex-col rounded-md bg-paper-raised">
              <div className="flex items-center justify-between border-b border-rule px-3 py-2">
                <span className="text-sm font-medium">{ROTULO_ETAPA_LEAD[etapa] ?? etapa}</span>
                <span className="text-xs text-ink-faint">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {cards.length === 0 && <p className="px-1 py-4 text-center text-xs text-ink-faint">—</p>}
                {cards.map((c) => (
                  <div key={c.id} className="rounded-sm border border-rule bg-paper p-2.5 text-sm">
                    <Link href={`/imob/leads/${c.id}`} className="font-medium hover:underline">
                      {c.nome}
                    </Link>
                    <p className="text-xs text-ink-soft">{ROTULO_ORIGEM_LEAD[c.origem] ?? c.origem}</p>
                    {c.valorPretendido !== null && (
                      <p className="text-xs text-ink-soft">{centavosParaReais(c.valorPretendido)}</p>
                    )}
                    {c.corretorNome && <p className="text-xs text-ink-faint">{c.corretorNome}</p>}
                    {podeEditar && (
                      <select
                        value={c.etapa}
                        disabled={pending}
                        onChange={(e) => mover(c.id, e.target.value)}
                        className="mt-2 w-full rounded-sm border border-rule bg-paper-raised px-1.5 py-1 text-xs outline-none"
                      >
                        {etapas.map((et) => (
                          <option key={et} value={et}>
                            {ROTULO_ETAPA_LEAD[et] ?? et}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {criando && <LeadForm item={null} opcoes={opcoes} onFechar={() => setCriando(false)} />}
    </div>
  );
}
