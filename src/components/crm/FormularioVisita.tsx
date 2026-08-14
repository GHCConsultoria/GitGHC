"use client";

import type { ResultadoVisita } from "@prisma/client";
import { useState, useTransition } from "react";
import { registrarVisita } from "@/lib/crm/acoes";

const CLASSE_INPUT = "w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass";

const ROTULO_RESULTADO: Record<ResultadoVisita, string> = {
  REALIZADA: "Realizada",
  REMARCADA: "Remarcada",
  NAO_COMPARECEU: "Não compareceu",
  CANCELADA: "Cancelada",
};

function hojeISO(): string {
  // Data de hoje em São Paulo no formato do <input type="date">.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function FormularioVisita({ leadId }: { leadId: string }) {
  const [dataVisita, setDataVisita] = useState(hojeISO());
  const [local, setLocal] = useState("");
  const [resultado, setResultado] = useState<ResultadoVisita>("REALIZADA");
  const [anotacoes, setAnotacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    iniciarTransicao(async () => {
      const r = await registrarVisita({ leadId, dataVisita, local, resultado, anotacoes });
      if (!r.sucesso) {
        setErro(r.erro);
        return;
      }
      setLocal("");
      setAnotacoes("");
      setResultado("REALIZADA");
      setDataVisita(hojeISO());
    });
  }

  return (
    <form onSubmit={enviar} className="paper-card grid grid-cols-1 gap-3 rounded-sm p-4 sm:grid-cols-2">
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Data da visita</span>
        <input
          type="date"
          required
          value={dataVisita}
          onChange={(e) => setDataVisita(e.target.value)}
          className={`${CLASSE_INPUT} font-data`}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Resultado</span>
        <select
          value={resultado}
          onChange={(e) => setResultado(e.target.value as ResultadoVisita)}
          className={CLASSE_INPUT}
        >
          {(Object.keys(ROTULO_RESULTADO) as ResultadoVisita[]).map((r) => (
            <option key={r} value={r}>
              {ROTULO_RESULTADO[r]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm sm:col-span-2">
        <span className="eyebrow mb-1.5 block">Local (opcional)</span>
        <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} className={CLASSE_INPUT} />
      </label>

      <label className="text-sm sm:col-span-2">
        <span className="eyebrow mb-1.5 block">Anotações (opcional)</span>
        <textarea
          rows={3}
          value={anotacoes}
          onChange={(e) => setAnotacoes(e.target.value)}
          className={`${CLASSE_INPUT} resize-y`}
        />
      </label>

      {erro && <p className="text-sm text-urgent sm:col-span-2">{erro}</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Registrar visita"}
        </button>
      </div>
    </form>
  );
}
