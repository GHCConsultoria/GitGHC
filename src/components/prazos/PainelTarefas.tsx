"use client";

import { useState, useTransition } from "react";
import { criarTarefa, concluirTarefa, reabrirTarefa } from "@/lib/prazos/tarefas";

export interface TarefaExibicao {
  id: string;
  descricao: string;
  status: "PENDENTE" | "CONCLUIDA";
  responsavelId: string | null;
}

export interface UsuarioSelecionavel {
  id: string;
  nome: string;
}

/** Checklist de tarefas vinculadas a um prazo — transforma o prazo em ação concreta. */
export function PainelTarefas({
  prazoId,
  tarefas,
  usuarios,
}: {
  prazoId: string;
  tarefas: TarefaExibicao[];
  usuarios: UsuarioSelecionavel[];
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const pendentes = tarefas.filter((tarefa) => tarefa.status === "PENDENTE").length;

  return (
    <div className="mt-5 border-t border-rule pt-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          Tarefas {tarefas.length > 0 && <span className="text-ink-faint">· {pendentes} pendente(s)</span>}
        </p>
        <button
          type="button"
          onClick={() => setMostrarFormulario((valor) => !valor)}
          className="text-xs font-medium text-ink-soft transition-colors hover:text-brass"
        >
          {mostrarFormulario ? "cancelar" : "+ nova tarefa"}
        </button>
      </div>

      {tarefas.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {tarefas.map((tarefa) => (
            <ItemTarefa key={tarefa.id} tarefa={tarefa} usuarios={usuarios} />
          ))}
        </ul>
      )}

      {mostrarFormulario && (
        <FormularioNovaTarefa
          prazoId={prazoId}
          usuarios={usuarios}
          onCriada={() => setMostrarFormulario(false)}
        />
      )}
    </div>
  );
}

function ItemTarefa({ tarefa, usuarios }: { tarefa: TarefaExibicao; usuarios: UsuarioSelecionavel[] }) {
  const [pendente, iniciarTransicao] = useTransition();
  const concluida = tarefa.status === "CONCLUIDA";
  const responsavel = usuarios.find((usuario) => usuario.id === tarefa.responsavelId);

  function alternar() {
    iniciarTransicao(async () => {
      if (concluida) {
        await reabrirTarefa({ tarefaId: tarefa.id });
      } else {
        await concluirTarefa({ tarefaId: tarefa.id });
      }
    });
  }

  return (
    <li className="flex items-start gap-2.5 text-sm">
      <button
        type="button"
        disabled={pendente}
        onClick={alternar}
        aria-label={concluida ? "reabrir tarefa" : "concluir tarefa"}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-50 ${
          concluida ? "border-calm bg-calm text-calm-on" : "border-rule hover:border-brass"
        }`}
      >
        {concluida && (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
            <path d="M1.5 5 4 7.5 8.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={concluida ? "text-ink-faint line-through" : "text-ink"}>
        {tarefa.descricao}
        {responsavel && <span className="ml-2 text-xs text-ink-faint">· {responsavel.nome}</span>}
      </span>
    </li>
  );
}

function FormularioNovaTarefa({
  prazoId,
  usuarios,
  onCriada,
}: {
  prazoId: string;
  usuarios: UsuarioSelecionavel[];
  onCriada: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded-sm border border-rule bg-paper p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        setErro(null);
        iniciarTransicao(async () => {
          const resultado = await criarTarefa({
            prazoId,
            descricao,
            responsavelId: responsavelId || undefined,
          });
          if (!resultado.sucesso) {
            setErro(resultado.erro);
            return;
          }
          setDescricao("");
          setResponsavelId("");
          onCriada();
        });
      }}
    >
      <input
        type="text"
        value={descricao}
        onChange={(evento) => setDescricao(evento.target.value)}
        placeholder="ex.: elaborar contestação"
        required
        minLength={3}
        className="w-full rounded-sm border border-rule bg-paper-raised px-2.5 py-1.5 text-sm outline-none focus:border-brass"
      />
      <div className="flex gap-2">
        <select
          value={responsavelId}
          onChange={(evento) => setResponsavelId(evento.target.value)}
          className="flex-1 rounded-sm border border-rule bg-paper-raised px-2.5 py-1.5 text-sm outline-none focus:border-brass"
        >
          <option value="">Sem responsável</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-ink px-3 py-1.5 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      {erro && <p className="text-sm text-urgent">{erro}</p>}
    </form>
  );
}
