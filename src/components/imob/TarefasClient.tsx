"use client";

import { useState, useTransition } from "react";
import {
  Campo,
  CampoSelect,
  CampoTextarea,
  CLASSE_BOTAO_NEUTRO,
  CLASSE_BOTAO_PRIMARIO,
  Mensagem,
  Modal,
} from "@/components/imob/primitivos";
import { alternarConclusaoTarefa, criarTarefa } from "@/lib/imob/acoes-crm";
import { formatarData } from "@/lib/imob/formato";
import { ROTULO_PRIORIDADE } from "@/lib/imob/rotulos";

export interface TarefaView {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  prazo: string | null;
  status: string;
}

interface Opcoes {
  usuarios: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  imoveis: Array<{ id: string; nome: string }>;
}

const PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"].map((p) => ({ valor: p, rotulo: ROTULO_PRIORIDADE[p] ?? p }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

const CORES_PRIORIDADE: Record<string, string> = {
  BAIXA: "text-ink-faint",
  MEDIA: "text-ink-soft",
  ALTA: "text-amber-700",
  URGENTE: "text-urgent",
};

export function TarefasClient({
  tarefas,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  tarefas: TarefaView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [criando, setCriando] = useState(false);
  const [pending, start] = useTransition();

  function alternar(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await alternarConclusaoTarefa(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setCriando(true)} className={CLASSE_BOTAO_PRIMARIO}>
            + Nova tarefa
          </button>
        </div>
      )}

      {tarefas.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma tarefa.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tarefas.map((t) => {
            const concluida = t.status === "CONCLUIDA";
            return (
              <li key={t.id} className="paper-card flex items-start gap-3 rounded-md p-4">
                <input
                  type="checkbox"
                  checked={concluida}
                  disabled={!podeEditar || pending}
                  onChange={() => alternar(t.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className={`font-medium ${concluida ? "text-ink-faint line-through" : ""}`}>{t.titulo}</p>
                  {t.descricao && <p className="text-sm text-ink-soft">{t.descricao}</p>}
                  <p className="mt-1 text-xs">
                    <span className={CORES_PRIORIDADE[t.prioridade] ?? ""}>{ROTULO_PRIORIDADE[t.prioridade]}</span>
                    {t.prazo && <span className="text-ink-faint"> · vence {formatarData(t.prazo)}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {criando && <ModalTarefa opcoes={opcoes} onFechar={() => setCriando(false)} />}
    </div>
  );
}

function ModalTarefa({ opcoes, onFechar }: { opcoes: Opcoes; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await criarTarefa(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Nova tarefa" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Campo rotulo="Título" name="titulo" required />
        <CampoTextarea rotulo="Descrição" name="descricao" rows={2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Prioridade" name="prioridade" opcoes={PRIORIDADES} defaultValue="MEDIA" />
          <Campo rotulo="Prazo" name="prazo" type="date" />
          <CampoSelect
            rotulo="Responsável"
            name="responsavelId"
            opcoes={paraOpcoes(opcoes.usuarios)}
            incluirVazio="Ninguém"
          />
          <CampoSelect rotulo="Cliente" name="clienteId" opcoes={paraOpcoes(opcoes.clientes)} incluirVazio="Nenhum" />
          <CampoSelect rotulo="Imóvel" name="imovelId" opcoes={paraOpcoes(opcoes.imoveis)} incluirVazio="Nenhum" />
        </div>
        <Mensagem erro={erro} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={CLASSE_BOTAO_NEUTRO}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "Salvando…" : "Criar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
