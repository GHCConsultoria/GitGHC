"use client";

import { useState, useTransition } from "react";
import { LeadForm, type LeadFormValores, type OpcoesLead } from "@/components/imob/LeadForm";
import { CampoSelect, CampoTextarea, CLASSE_BOTAO_PRIMARIO, Mensagem } from "@/components/imob/primitivos";
import { registrarInteracao } from "@/lib/imob/acoes-crm";
import { formatarData } from "@/lib/imob/formato";
import { ROTULO_ETAPA_LEAD, ROTULO_ORIGEM_LEAD } from "@/lib/imob/rotulos";

interface Interacao {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: string;
}

const TIPOS_INTERACAO = [
  { valor: "LIGACAO", rotulo: "Ligação" },
  { valor: "WHATSAPP", rotulo: "WhatsApp" },
  { valor: "EMAIL", rotulo: "E-mail" },
  { valor: "REUNIAO", rotulo: "Reunião" },
  { valor: "NOTA", rotulo: "Nota" },
];

export function LeadDetalheClient({
  lead,
  interacoes,
  opcoes,
  podeEditar,
}: {
  lead: LeadFormValores & { corretorNome: string | null };
  interacoes: Interacao[];
  opcoes: OpcoesLead;
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onInteracao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("leadId", lead.id);
    start(async () => {
      const r = await registrarInteracao(fd);
      if (r.sucesso) form.reset();
      else setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="paper-card rounded-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
              {ROTULO_ETAPA_LEAD[lead.etapa] ?? lead.etapa}
            </span>
            <h1 className="font-display mt-1 text-2xl">{lead.nome}</h1>
            <p className="text-sm text-ink-soft">
              {ROTULO_ORIGEM_LEAD[lead.origem] ?? lead.origem}
              {lead.corretorNome ? ` · ${lead.corretorNome}` : ""}
            </p>
          </div>
          {podeEditar && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-sm border border-rule px-4 py-2 text-sm hover:bg-paper-raised"
            >
              Editar
            </button>
          )}
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <Dado rotulo="Telefone" valor={lead.telefone} />
          <Dado rotulo="WhatsApp" valor={lead.whatsapp} />
          <Dado rotulo="E-mail" valor={lead.email} />
          <Dado rotulo="Próxima ação" valor={lead.proximaAcao ? formatarData(lead.proximaAcao) : null} />
        </dl>
        {lead.observacoes && <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">{lead.observacoes}</p>}
      </section>

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-3">Interações</p>
        {podeEditar && (
          <form onSubmit={onInteracao} className="mb-4 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <CampoSelect rotulo="Tipo" name="tipo" opcoes={TIPOS_INTERACAO} defaultValue="LIGACAO" />
              <CampoTextarea rotulo="Descrição" name="descricao" rows={2} />
            </div>
            <Mensagem erro={erro} />
            <div>
              <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
                {pending ? "Registrando…" : "Registrar interação"}
              </button>
            </div>
          </form>
        )}
        {interacoes.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma interação registrada.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {interacoes.map((i) => (
              <li key={i.id} className="rounded-sm border border-rule p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {TIPOS_INTERACAO.find((t) => t.valor === i.tipo)?.rotulo ?? i.tipo}
                  </span>
                  <span className="text-xs text-ink-faint">{formatarData(i.criadoEm)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-ink-soft">{i.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editando && <LeadForm item={lead} opcoes={opcoes} onFechar={() => setEditando(false)} />}
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{rotulo}</p>
      <p>{valor || "—"}</p>
    </div>
  );
}
