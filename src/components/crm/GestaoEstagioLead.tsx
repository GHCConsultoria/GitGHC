"use client";

import type { EstagioLead } from "@prisma/client";
import { useState, useTransition } from "react";
import { marcarLeadGanho, marcarLeadPerdido, moverEstagioLead } from "@/lib/crm/acoes";
import { ESTAGIOS_PIPELINE, rotuloEstagio } from "@/lib/crm/funil";
import { parseMoedaParaCentavos } from "@/lib/crm/moeda";

// Estágios do pipeline que NÃO são o terminal GANHO — os selecionáveis no
// dropdown de "mover". Ganhar/Perder têm botões dedicados porque capturam
// dados extras (valor / motivo).
const ESTAGIOS_MOVIVEIS = ESTAGIOS_PIPELINE.filter((m) => m.estagio !== "GANHO");

const CLASSE_INPUT = "w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass";

export function GestaoEstagioLead({
  leadId,
  estagioAtual,
  motivos,
}: {
  leadId: string;
  estagioAtual: EstagioLead;
  motivos: Array<{ id: string; descricao: string }>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const [painel, setPainel] = useState<"nenhum" | "ganho" | "perda">("nenhum");
  const [valorFechado, setValorFechado] = useState("");
  const [motivoId, setMotivoId] = useState("");
  const [detalhe, setDetalhe] = useState("");

  function mover(estagio: EstagioLead) {
    if (estagio === estagioAtual) return;
    setErro(null);
    iniciarTransicao(async () => {
      const r = await moverEstagioLead({ leadId, estagio });
      if (!r.sucesso) setErro(r.erro);
    });
  }

  function confirmarGanho() {
    setErro(null);
    if (valorFechado.trim() && parseMoedaParaCentavos(valorFechado) === null) {
      setErro("valor fechado inválido");
      return;
    }
    iniciarTransicao(async () => {
      const r = await marcarLeadGanho({ leadId, valorFechadoCentavos: parseMoedaParaCentavos(valorFechado) });
      if (!r.sucesso) {
        setErro(r.erro);
        return;
      }
      setPainel("nenhum");
      setValorFechado("");
    });
  }

  function confirmarPerda() {
    setErro(null);
    if (!motivoId) {
      setErro("escolha o motivo da perda");
      return;
    }
    iniciarTransicao(async () => {
      const r = await marcarLeadPerdido({ leadId, motivoPerdaId: motivoId, detalhePerda: detalhe });
      if (!r.sucesso) {
        setErro(r.erro);
        return;
      }
      setPainel("nenhum");
      setMotivoId("");
      setDetalhe("");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Estágio no funil</span>
        <select
          value={estagioAtual === "GANHO" || estagioAtual === "PERDIDO" ? "" : estagioAtual}
          disabled={pendente}
          onChange={(e) => mover(e.target.value as EstagioLead)}
          className={CLASSE_INPUT}
        >
          {(estagioAtual === "GANHO" || estagioAtual === "PERDIDO") && (
            <option value="">{rotuloEstagio(estagioAtual)} — reabrir movendo abaixo</option>
          )}
          {ESTAGIOS_MOVIVEIS.map((m) => (
            <option key={m.estagio} value={m.estagio}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendente}
          onClick={() => setPainel(painel === "ganho" ? "nenhum" : "ganho")}
          className="rounded-sm border border-calm-line bg-calm-bg px-3 py-1.5 text-sm font-medium text-calm transition-colors hover:brightness-95 disabled:opacity-50"
        >
          Marcar como ganho
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => setPainel(painel === "perda" ? "nenhum" : "perda")}
          className="rounded-sm border border-urgent-line bg-urgent-bg px-3 py-1.5 text-sm font-medium text-urgent transition-colors hover:brightness-95 disabled:opacity-50"
        >
          Marcar como perdido
        </button>
      </div>

      {painel === "ganho" && (
        <div className="paper-card flex flex-col gap-2 rounded-sm p-3">
          <label className="text-sm">
            <span className="eyebrow mb-1.5 block">Valor fechado (R$)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="1.500,00"
              value={valorFechado}
              onChange={(e) => setValorFechado(e.target.value)}
              className={`${CLASSE_INPUT} font-data`}
            />
          </label>
          <button
            type="button"
            disabled={pendente}
            onClick={confirmarGanho}
            className="self-start rounded-sm bg-brass px-3 py-1.5 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50"
          >
            {pendente ? "Salvando…" : "Confirmar ganho"}
          </button>
        </div>
      )}

      {painel === "perda" && (
        <div className="paper-card flex flex-col gap-2 rounded-sm p-3">
          <label className="text-sm">
            <span className="eyebrow mb-1.5 block">Motivo da perda</span>
            <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} className={CLASSE_INPUT}>
              <option value="">Escolha um motivo…</option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.descricao}
                </option>
              ))}
            </select>
          </label>
          {motivos.length === 0 && (
            <p className="text-xs text-ink-faint">
              Nenhum motivo cadastrado ainda — cadastre um na página de leads antes de registrar a perda.
            </p>
          )}
          <label className="text-sm">
            <span className="eyebrow mb-1.5 block">Detalhe (opcional)</span>
            <input type="text" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} className={CLASSE_INPUT} />
          </label>
          <button
            type="button"
            disabled={pendente}
            onClick={confirmarPerda}
            className="self-start rounded-sm bg-brass px-3 py-1.5 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50"
          >
            {pendente ? "Salvando…" : "Confirmar perda"}
          </button>
        </div>
      )}

      {erro && <p className="text-sm text-urgent">{erro}</p>}
    </div>
  );
}
