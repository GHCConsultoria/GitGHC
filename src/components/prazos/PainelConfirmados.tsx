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
  podeConfirmar,
}: {
  prazos: PrazoConfirmadoComRascunho[];
  usuarios: UsuarioSelecionavel[];
  podeConfirmar: boolean;
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
          <ItemConfirmado prazo={prazo} usuarios={usuarios} podeConfirmar={podeConfirmar} />
        </li>
      ))}
    </ul>
  );
}

function ItemConfirmado({
  prazo,
  usuarios,
  podeConfirmar,
}: {
  prazo: PrazoConfirmadoComRascunho;
  usuarios: UsuarioSelecionavel[];
  podeConfirmar: boolean;
}) {
  const rascunhoExistente = prazo.rascunhosPeticao[0];
  const [conteudo, setConteudo] = useState(rascunhoExistente?.conteudo ?? "");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cumprido, setCumprido] = useState(false);
  const [mostrarFormCumprir, setMostrarFormCumprir] = useState(false);
  const [erroCumprir, setErroCumprir] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const [pendenteCumprir, iniciarTransicaoCumprir] = useTransition();

  function cumprir(numeroProtocolo: string, comprovanteUrl: string, observacaoProtocolo: string) {
    setErroCumprir(null);
    iniciarTransicaoCumprir(async () => {
      const resultado = await marcarPrazoComoCumprido({
        prazoId: prazo.id,
        numeroProtocolo,
        comprovanteUrl,
        observacaoProtocolo,
      });
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
        {podeConfirmar && !mostrarFormCumprir && (
          <button
            type="button"
            disabled={pendenteCumprir}
            onClick={() => setMostrarFormCumprir(true)}
            className="rounded-sm border border-calm-line/40 px-4 py-1.5 text-sm font-medium text-calm transition-colors hover:bg-calm-bg disabled:opacity-50"
          >
            Marcar como cumprido
          </button>
        )}
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

      {mostrarFormCumprir && (
        <FormularioProtocolo
          pendente={pendenteCumprir}
          erro={erroCumprir}
          onCancelar={() => {
            setMostrarFormCumprir(false);
            setErroCumprir(null);
          }}
          onConfirmar={cumprir}
        />
      )}

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

/**
 * "Controle de protocolo": o ciclo publicação → prazo → confirmação só fecha
 * com evidência de que o ato foi de fato praticado — número de protocolo é
 * obrigatório, comprovante (link) e observação são opcionais.
 */
function FormularioProtocolo({
  pendente,
  erro,
  onCancelar,
  onConfirmar,
}: {
  pendente: boolean;
  erro: string | null;
  onCancelar: () => void;
  onConfirmar: (numeroProtocolo: string, comprovanteUrl: string, observacaoProtocolo: string) => void;
}) {
  const [numeroProtocolo, setNumeroProtocolo] = useState("");
  const [comprovanteUrl, setComprovanteUrl] = useState("");
  const [observacaoProtocolo, setObservacaoProtocolo] = useState("");

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-sm border border-calm-line/30 bg-calm-bg/40 p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        onConfirmar(numeroProtocolo, comprovanteUrl, observacaoProtocolo);
      }}
    >
      <p className="text-xs text-ink-soft">
        Registre a evidência de que o ato foi protocolado — é isso que fecha o ciclo com prova, não só uma alegação.
      </p>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Número do protocolo (obrigatório)</span>
        <input
          type="text"
          value={numeroProtocolo}
          onChange={(evento) => setNumeroProtocolo(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
          required
        />
      </label>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Link do comprovante (opcional)</span>
        <input
          type="url"
          value={comprovanteUrl}
          onChange={(evento) => setComprovanteUrl(evento.target.value)}
          placeholder="https://..."
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
        />
      </label>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Observação (opcional)</span>
        <textarea
          value={observacaoProtocolo}
          onChange={(evento) => setObservacaoProtocolo(evento.target.value)}
          rows={2}
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>
      {erro && <p className="text-sm text-urgent">{erro}</p>}
      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-calm px-4 py-2 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendente ? "Marcando…" : "Confirmar cumprimento"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-sm border border-rule px-4 py-2 text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
