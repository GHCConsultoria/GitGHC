"use client";

import { useState, useTransition } from "react";
import { gerarRascunhoPeticao } from "@/lib/ia/acoes";
import { marcarPrazoComoCumprido } from "@/lib/prazos/acoes";
import { formatarDataCalendario } from "@/lib/formatacao";
import type { PrazoConfirmadoComRascunho } from "@/lib/prazos/fila";
import { PainelTarefas, type UsuarioSelecionavel } from "./PainelTarefas";

export function PainelConfirmados({
  prazos,
  usuarios,
}: {
  prazos: PrazoConfirmadoComRascunho[];
  usuarios: UsuarioSelecionavel[];
}) {
  if (prazos.length === 0) {
    return (
      <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
        Nenhum prazo confirmado ainda.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {prazos.map((prazo, indice) => (
        <li key={prazo.id} className="stagger-in" style={{ "--stagger-index": indice } as React.CSSProperties}>
          <ItemConfirmado prazo={prazo} usuarios={usuarios} />
        </li>
      ))}
    </ul>
  );
}

function ItemConfirmado({ prazo, usuarios }: { prazo: PrazoConfirmadoComRascunho; usuarios: UsuarioSelecionavel[] }) {
  const rascunhoExistente = prazo.rascunhosPeticao[0];
  const [conteudo, setConteudo] = useState(rascunhoExistente?.conteudo ?? "");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cumprido, setCumprido] = useState(false);
  const [erroCumprir, setErroCumprir] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const [pendenteCumprir, iniciarTransicaoCumprir] = useTransition();

  function cumprir() {
    setErroCumprir(null);
    iniciarTransicaoCumprir(async () => {
      const resultado = await marcarPrazoComoCumprido({ prazoId: prazo.id });
      if (!resultado.sucesso) {
        setErroCumprir(resultado.erro);
        return;
      }
      setCumprido(true);
    });
  }

  function gerar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await gerarRascunhoPeticao({ prazoId: prazo.id });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setConteudo(resultado.conteudo);
      setMostrar(true);
    });
  }

  async function copiar() {
    await navigator.clipboard.writeText(conteudo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (cumprido) {
    return (
      <div className="paper-card rounded-sm border-l-[3px] border-l-calm-line p-5 text-sm text-calm">
        {prazo.processo.cliente} · {prazo.tipoAto} — marcado como cumprido.
      </div>
    );
  }

  return (
    <div className="paper-card rounded-sm border-l-[3px] border-l-calm-line p-5">
      <p className="eyebrow">
        {prazo.processo.cliente} · {prazo.processo.numeroCnj}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {prazo.tipoAto} — data fatal <span className="font-data text-ink">{formatarDataCalendario(prazo.dataFatal)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={pendente}
          onClick={gerar}
          className="rounded-sm bg-brass px-4 py-1.5 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Gerando…" : rascunhoExistente ? "Gerar novo rascunho com IA" : "Gerar rascunho com IA"}
        </button>
        <button
          type="button"
          disabled={pendenteCumprir}
          onClick={cumprir}
          className="rounded-sm border border-calm-line/40 px-4 py-1.5 text-sm font-medium text-calm transition-colors hover:bg-calm-bg disabled:opacity-50"
        >
          {pendenteCumprir ? "Marcando…" : "Marcar como cumprido"}
        </button>
        {conteudo && (
          <button
            type="button"
            onClick={() => setMostrar((valor) => !valor)}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-brass"
          >
            {mostrar ? "Ocultar rascunho" : "Ver rascunho"}
          </button>
        )}
      </div>

      {erro && <p className="mt-2 text-sm text-urgent">{erro}</p>}
      {erroCumprir && <p className="mt-2 text-sm text-urgent">{erroCumprir}</p>}

      <div className={`expand ${mostrar && conteudo ? "is-open" : ""}`}>
        <div>
          <div className="mt-4 border-t border-rule pt-4">
            <p className="mb-2 text-xs text-urgent">
              Rascunho gerado por IA — revise com atenção antes de usar. Nunca protocole ou envie sem revisão humana.
            </p>
            <textarea
              value={conteudo}
              onChange={(evento) => setConteudo(evento.target.value)}
              rows={14}
              className="w-full rounded-sm border border-rule bg-paper-raised p-3 font-data text-xs leading-relaxed outline-none focus:border-brass"
            />
            <button
              type="button"
              onClick={copiar}
              className="mt-2 rounded-sm border border-rule px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brass hover:text-ink"
            >
              {copiado ? "Copiado!" : "Copiar texto"}
            </button>
          </div>
        </div>
      </div>

      <PainelTarefas
        prazoId={prazo.id}
        tarefas={prazo.tarefas.map((tarefa) => ({
          id: tarefa.id,
          descricao: tarefa.descricao,
          status: tarefa.status,
          responsavelId: tarefa.responsavelId,
        }))}
        usuarios={usuarios}
      />
    </div>
  );
}
