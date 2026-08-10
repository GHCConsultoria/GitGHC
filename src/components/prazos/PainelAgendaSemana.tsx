"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { editarDataFatalPrazo } from "@/lib/prazos/acoes";

export interface ItemAgenda {
  id: string;
  publicacaoId: string;
  status: "PENDENTE_CONFIRMACAO" | "CONFIRMADO" | "CUMPRIDO" | "DESCARTADO";
  tipoAto: string;
  cliente: string;
  numeroCnj: string;
  /** yyyy-mm-dd — chave do dia, lida direto dos componentes UTC de dataFatal (convenção do projeto: dia-calendário). */
  dataChave: string;
}

const RUBRICA_STATUS: Record<ItemAgenda["status"], string> = {
  PENDENTE_CONFIRMACAO: "border-l-attention-line",
  CONFIRMADO: "border-l-calm-line",
  CUMPRIDO: "border-l-rule",
  DESCARTADO: "border-l-rule",
};

function formatarDiaCurto(chave: string): string {
  const [, mes, dia] = chave.split("-");
  return `${dia}/${mes}`;
}

/** Agenda semanal com arrastar-e-soltar: só prazos PENDENTE_CONFIRMACAO podem ser arrastados (editarDataFatalPrazo exige esse status e uma justificativa). */
export function PainelAgendaSemana({
  diasChave,
  itens,
  podeReagendar,
}: {
  diasChave: string[];
  itens: ItemAgenda[];
  podeReagendar: boolean;
}) {
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [pendente, setPendente] = useState<{ item: ItemAgenda; novaDataChave: string } | null>(null);

  const itensPorDia = useMemo(() => {
    const grupos = new Map<string, ItemAgenda[]>();
    for (const chave of diasChave) grupos.set(chave, []);
    for (const item of itens) {
      const grupo = grupos.get(item.dataChave);
      if (grupo) grupo.push(item);
      else grupos.set(item.dataChave, [item]);
    }
    return grupos;
  }, [diasChave, itens]);

  function aoSoltarEm(diaChave: string) {
    if (!arrastandoId || !podeReagendar) return;
    const item = itens.find((candidato) => candidato.id === arrastandoId);
    setArrastandoId(null);
    if (!item || item.status !== "PENDENTE_CONFIRMACAO" || item.dataChave === diaChave) return;
    setPendente({ item, novaDataChave: diaChave });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {diasChave.map((chave) => (
          <div
            key={chave}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={() => aoSoltarEm(chave)}
            className="min-h-[8rem] rounded-sm border border-rule bg-paper p-2.5"
          >
            <p className="eyebrow mb-2 text-center">{formatarDiaCurto(chave)}</p>
            <ul className="flex flex-col gap-2">
              {(itensPorDia.get(chave) ?? []).map((item) => (
                <li
                  key={item.id}
                  draggable={podeReagendar && item.status === "PENDENTE_CONFIRMACAO"}
                  onDragStart={() => setArrastandoId(item.id)}
                  onDragEnd={() => setArrastandoId(null)}
                  className={`paper-card rounded-sm border-l-[3px] p-2 text-xs ${RUBRICA_STATUS[item.status]} ${
                    podeReagendar && item.status === "PENDENTE_CONFIRMACAO"
                      ? "cursor-grab active:cursor-grabbing"
                      : "opacity-80"
                  }`}
                >
                  <Link href={`/publicacoes/${item.publicacaoId}`} className="block hover:text-brass">
                    <p className="truncate font-medium text-ink">{item.cliente}</p>
                    <p className="mt-0.5 truncate text-ink-faint">{item.tipoAto}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        {podeReagendar
          ? "Arraste um prazo ainda não confirmado para outro dia pra reagendar (pede justificativa). Prazos confirmados/cumpridos são só leitura aqui."
          : "Só advogados podem reagendar prazos. Esta agenda está em modo leitura pro seu papel."}
      </p>

      {pendente && (
        <ModalJustificativa
          item={pendente.item}
          novaDataChave={pendente.novaDataChave}
          onFechar={() => setPendente(null)}
        />
      )}
    </div>
  );
}

function ModalJustificativa({
  item,
  novaDataChave,
  onFechar,
}: {
  item: ItemAgenda;
  novaDataChave: string;
  onFechar: () => void;
}) {
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onFechar}>
      <form
        onClick={(evento) => evento.stopPropagation()}
        className="paper-card w-full max-w-sm rounded-sm p-5"
        onSubmit={(evento) => {
          evento.preventDefault();
          setErro(null);
          iniciarTransicao(async () => {
            const resultado = await editarDataFatalPrazo({
              prazoId: item.id,
              novaDataFatal: novaDataChave,
              justificativa,
            });
            if (!resultado.sucesso) {
              setErro(resultado.erro);
              return;
            }
            onFechar();
          });
        }}
      >
        <p className="eyebrow mb-1">Reagendar</p>
        <h3 className="font-display text-lg">
          {item.cliente} → {formatarDiaCurto(novaDataChave)}
        </h3>
        <label className="mt-4 block text-sm">
          <span className="eyebrow mb-1.5 block">Justificativa (obrigatória)</span>
          <textarea
            value={justificativa}
            onChange={(evento) => setJustificativa(evento.target.value)}
            rows={2}
            minLength={5}
            required
            autoFocus
            className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
          />
        </label>
        {erro && <p className="mt-2 text-sm text-urgent">{erro}</p>}
        <div className="mt-4 flex gap-2.5">
          <button
            type="submit"
            disabled={pendente}
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pendente ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-sm border border-rule px-4 py-2 text-sm text-ink-soft hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
