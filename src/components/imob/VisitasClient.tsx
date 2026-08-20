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
import { criarVisita, registrarResultadoVisita } from "@/lib/imob/acoes-crm";
import { formatarData } from "@/lib/imob/formato";
import { ROTULO_STATUS_VISITA } from "@/lib/imob/rotulos";

export interface VisitaView {
  id: string;
  data: string;
  status: string;
  imovelCodigo: string | null;
  imovelTitulo: string | null;
  clienteNome: string | null;
  corretorNome: string | null;
  interesse: string | null;
  nota: number | null;
}

interface Opcoes {
  imoveis: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  corretores: Array<{ id: string; nome: string }>;
}

const STATUS = ["AGENDADA", "CONFIRMADA", "REALIZADA", "CANCELADA", "NAO_COMPARECEU"];
const INTERESSES = [
  { valor: "ALTO", rotulo: "Alto" },
  { valor: "MEDIO", rotulo: "Médio" },
  { valor: "BAIXO", rotulo: "Baixo" },
];
const opcStatus = STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_VISITA[s] ?? s }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

const CORES: Record<string, string> = {
  AGENDADA: "bg-amber-100 text-amber-800",
  CONFIRMADA: "bg-brass/15 text-brass-deep",
  REALIZADA: "bg-brass/15 text-brass-deep",
  CANCELADA: "bg-urgent-bg text-urgent",
  NAO_COMPARECEU: "bg-urgent-bg text-urgent",
};

export function VisitasClient({
  visitas,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  visitas: VisitaView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [agendando, setAgendando] = useState(false);
  const [resultado, setResultado] = useState<VisitaView | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setAgendando(true)} className={CLASSE_BOTAO_PRIMARIO}>
            + Agendar visita
          </button>
        </div>
      )}

      {visitas.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma visita agendada.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Corretor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => (
                <tr key={v.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">{formatarData(v.data)}</td>
                  <td className="px-4 py-3 text-ink-soft">{v.imovelCodigo ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{v.clienteNome ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{v.corretorNome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${CORES[v.status] ?? ""}`}>
                      {ROTULO_STATUS_VISITA[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => setResultado(v)}
                        className="text-ink-soft hover:text-ink hover:underline"
                      >
                        Resultado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {agendando && <ModalAgendar opcoes={opcoes} onFechar={() => setAgendando(false)} />}
      {resultado && <ModalResultado visita={resultado} onFechar={() => setResultado(null)} />}
    </div>
  );
}

function ModalAgendar({ opcoes, onFechar }: { opcoes: Opcoes; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await criarVisita(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Agendar visita" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <CampoSelect
          rotulo="Imóvel"
          name="imovelId"
          opcoes={paraOpcoes(opcoes.imoveis)}
          incluirVazio="Selecione…"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Cliente" name="clienteId" opcoes={paraOpcoes(opcoes.clientes)} incluirVazio="Nenhum" />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
          />
          <Campo rotulo="Data e hora" name="data" type="datetime-local" required />
          <Campo rotulo="Duração (min)" name="duracaoMin" type="number" defaultValue={30} />
        </div>
        <CampoTextarea rotulo="Observações" name="observacoes" />
        <Mensagem erro={erro} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={CLASSE_BOTAO_NEUTRO}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "Salvando…" : "Agendar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalResultado({ visita, onFechar }: { visita: VisitaView; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    fd.set("visitaId", visita.id);
    start(async () => {
      const r = await registrarResultadoVisita(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Resultado da visita" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Status" name="status" opcoes={opcStatus} defaultValue={visita.status} />
          <CampoSelect
            rotulo="Interesse"
            name="interesse"
            opcoes={INTERESSES}
            incluirVazio="—"
            defaultValue={visita.interesse ?? ""}
          />
          <Campo rotulo="Nota (0-10)" name="nota" type="number" defaultValue={visita.nota} />
        </div>
        <CampoTextarea rotulo="Feedback" name="feedback" />
        <CampoTextarea rotulo="Próximo passo" name="proximoPasso" rows={2} />
        <Mensagem erro={erro} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={CLASSE_BOTAO_NEUTRO}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
