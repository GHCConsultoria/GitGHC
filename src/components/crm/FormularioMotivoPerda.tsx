"use client";

import { useState, useTransition } from "react";
import { criarMotivoPerda } from "@/lib/crm/acoes";

// Cadastro rápido de um motivo de perda no catálogo do escritório.
export function FormularioMotivoPerda() {
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    iniciarTransicao(async () => {
      const r = await criarMotivoPerda({ descricao });
      if (!r.sucesso) {
        setErro(r.erro);
        return;
      }
      setDescricao("");
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="text"
        required
        placeholder="Preço, já usa concorrente, sem orçamento…"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        className="flex-1 rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
      />
      <button
        type="submit"
        disabled={pendente}
        className="rounded-sm border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
      >
        {pendente ? "…" : "Adicionar motivo"}
      </button>
      {erro && <p className="text-sm text-urgent sm:w-full">{erro}</p>}
    </form>
  );
}
