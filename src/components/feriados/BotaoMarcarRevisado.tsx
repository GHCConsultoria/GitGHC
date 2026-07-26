"use client";

import { useTransition } from "react";
import { marcarRevisao } from "@/lib/feriados/acoes";

export function BotaoMarcarRevisado({
  uf,
  ano,
  revisadoAtual,
}: {
  uf: string;
  ano: number;
  revisadoAtual: boolean;
}) {
  const [pendente, iniciarTransicao] = useTransition();

  function alternar() {
    iniciarTransicao(async () => {
      await marcarRevisao({ uf, ano, revisado: !revisadoAtual });
    });
  }

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={alternar}
      className={
        revisadoAtual
          ? "rounded-sm border border-rule px-4 py-2 text-sm text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
          : "rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
      }
    >
      {pendente ? "Salvando…" : revisadoAtual ? "Desmarcar revisão" : "Marcar como revisado"}
    </button>
  );
}
