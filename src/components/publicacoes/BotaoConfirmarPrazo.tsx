"use client";

import { useState, useTransition } from "react";
import { confirmarPrazo } from "@/lib/prazos/acoes";

export function BotaoConfirmarPrazo({ prazoId }: { prazoId: string }) {
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (confirmado) {
    return <p className="text-sm text-calm">Prazo confirmado.</p>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          setErro(null);
          iniciarTransicao(async () => {
            const resultado = await confirmarPrazo({ prazoId });
            if (!resultado.sucesso) {
              setErro(resultado.erro);
              return;
            }
            setConfirmado(true);
          });
        }}
        className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
      >
        {pendente ? "Confirmando…" : "Confirmar prazo"}
      </button>
      {erro && <p className="mt-2 text-sm text-urgent">{erro}</p>}
    </div>
  );
}
