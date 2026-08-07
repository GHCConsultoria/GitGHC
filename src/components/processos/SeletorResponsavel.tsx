"use client";

import { useState, useTransition } from "react";
import { atribuirResponsavelProcesso } from "@/lib/processos/acoes";

export function SeletorResponsavel({
  processoId,
  responsavelIdAtual,
  usuarios,
}: {
  processoId: string;
  responsavelIdAtual: string | null;
  usuarios: Array<{ id: string; nome: string }>;
}) {
  const [responsavelId, setResponsavelId] = useState(responsavelIdAtual ?? "");
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <select
      value={responsavelId}
      disabled={pendente}
      onChange={(evento) => {
        const valor = evento.target.value;
        setResponsavelId(valor);
        iniciarTransicao(async () => {
          await atribuirResponsavelProcesso({ processoId, responsavelId: valor || null });
        });
      }}
      className="rounded-sm border border-rule bg-paper-raised px-2 py-1 text-xs text-ink-soft outline-none focus:border-brass disabled:opacity-50"
    >
      <option value="">Sem responsável</option>
      {usuarios.map((usuario) => (
        <option key={usuario.id} value={usuario.id}>
          {usuario.nome}
        </option>
      ))}
    </select>
  );
}
