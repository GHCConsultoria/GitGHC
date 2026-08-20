"use client";

import { useState, useTransition } from "react";
import { CampoSelect, CampoTextarea, CLASSE_BOTAO_PRIMARIO, Mensagem } from "@/components/imob/primitivos";
import { mudarStatusProposta } from "@/lib/imob/acoes-fin";
import { ROTULO_STATUS_PROPOSTA } from "@/lib/imob/rotulos";

const STATUS = ["RASCUNHO", "ENVIADA", "EM_ANALISE", "ACEITA", "RECUSADA", "EXPIRADA", "CANCELADA"];
const opcStatus = STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_PROPOSTA[s] ?? s }));

export function PropostaStatusForm({ propostaId, statusAtual }: { propostaId: string; statusAtual: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    fd.set("propostaId", propostaId);
    start(async () => {
      const r = await mudarStatusProposta(fd);
      if (r.sucesso) setOk(true);
      else setErro(r.erro);
    });
  }

  return (
    <form onSubmit={onSubmit} className="paper-card flex flex-col gap-3 rounded-md p-6">
      <p className="eyebrow">Mudar status</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSelect rotulo="Novo status" name="status" opcoes={opcStatus} defaultValue={statusAtual} />
        <CampoTextarea rotulo="Observação (opcional)" name="observacao" rows={2} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
          {pending ? "Salvando…" : "Registrar mudança"}
        </button>
        {ok && <span className="text-sm text-brass-deep">Registrado.</span>}
        <Mensagem erro={erro} />
      </div>
    </form>
  );
}
