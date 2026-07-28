"use client";

import { useState, useTransition } from "react";
import { atualizarTelefoneWhatsapp } from "@/lib/usuarios/acoes";

export function FormularioTelefoneWhatsapp({
  usuarioId,
  telefoneInicial,
}: {
  usuarioId: string;
  telefoneInicial: string | null;
}) {
  const [telefone, setTelefone] = useState(telefoneInicial ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    iniciarTransicao(async () => {
      const resultado = await atualizarTelefoneWhatsapp({ usuarioId, telefoneWhatsapp: telefone });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
      setTimeout(() => setSucesso(false), 2000);
    });
  }

  return (
    <form onSubmit={enviar} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="+5511999999999"
        value={telefone}
        onChange={(evento) => setTelefone(evento.target.value)}
        className="w-44 rounded-sm border border-rule bg-paper-raised px-2.5 py-1 font-data text-xs outline-none focus:border-brass"
      />
      <button
        type="submit"
        disabled={pendente}
        className="rounded-sm border border-rule px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-brass hover:text-ink disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Salvar WhatsApp"}
      </button>
      {sucesso && <span className="text-xs text-calm">Salvo.</span>}
      {erro && <span className="text-xs text-urgent">{erro}</span>}
    </form>
  );
}
