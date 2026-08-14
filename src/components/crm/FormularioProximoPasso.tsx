"use client";

import { useState, useTransition } from "react";
import { adicionarProximoPasso } from "@/lib/crm/acoes";

const CLASSE_INPUT = "w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass";

function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function FormularioProximoPasso({ leadId }: { leadId: string }) {
  const [descricao, setDescricao] = useState("");
  const [dataPrevista, setDataPrevista] = useState(hojeISO());
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    iniciarTransicao(async () => {
      const r = await adicionarProximoPasso({ leadId, descricao, dataPrevista });
      if (!r.sucesso) {
        setErro(r.erro);
        return;
      }
      setDescricao("");
      setDataPrevista(hojeISO());
    });
  }

  return (
    <form onSubmit={enviar} className="paper-card flex flex-col gap-3 rounded-sm p-4 sm:flex-row sm:items-end">
      <label className="flex-1 text-sm">
        <span className="eyebrow mb-1.5 block">Próximo passo</span>
        <input
          type="text"
          required
          placeholder="Enviar proposta, retornar ligação…"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Data prevista</span>
        <input
          type="date"
          required
          value={dataPrevista}
          onChange={(e) => setDataPrevista(e.target.value)}
          className={`${CLASSE_INPUT} font-data`}
        />
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Adicionar"}
      </button>
      {erro && <p className="text-sm text-urgent sm:w-full">{erro}</p>}
    </form>
  );
}
