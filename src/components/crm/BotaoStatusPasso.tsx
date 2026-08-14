"use client";

import { useTransition } from "react";
import { mudarStatusPasso } from "@/lib/crm/acoes";

// Botões de mudança de status de um próximo passo. Renderizado tanto na
// agenda quanto no detalhe do lead — por isso é um componente cliente enxuto.
export function BotaoStatusPasso({
  passoId,
  acao,
  rotulo,
  tom = "neutro",
}: {
  passoId: string;
  acao: "CONCLUIR" | "CANCELAR" | "REABRIR";
  rotulo: string;
  tom?: "neutro" | "calm";
}) {
  const [pendente, iniciarTransicao] = useTransition();

  function clicar() {
    iniciarTransicao(async () => {
      await mudarStatusPasso({ passoId, acao });
    });
  }

  const classeTom =
    tom === "calm" ? "border-calm-line bg-calm-bg text-calm" : "border-rule bg-paper text-ink-soft hover:text-ink";

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={clicar}
      className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95 disabled:opacity-50 ${classeTom}`}
    >
      {pendente ? "…" : rotulo}
    </button>
  );
}
