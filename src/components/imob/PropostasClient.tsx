"use client";

import Link from "next/link";
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
import { criarProposta, editarProposta, mudarStatusProposta } from "@/lib/imob/acoes-fin";
import { centavosParaInput, centavosParaReais, formatarData } from "@/lib/imob/formato";
import { ROTULO_STATUS_PROPOSTA } from "@/lib/imob/rotulos";

export interface PropostaView {
  id: string;
  imovelId: string;
  clienteId: string | null;
  corretorId: string | null;
  valorProposto: number;
  valorSolicitado: number | null;
  formaPagamento: string | null;
  entrada: number | null;
  financiamento: boolean;
  permuta: boolean;
  validade: string | null;
  observacoes: string | null;
  status: string;
  data: string;
  imovelCodigo: string | null;
  clienteNome: string | null;
}

interface Opcoes {
  imoveis: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  corretores: Array<{ id: string; nome: string }>;
}

const STATUS = ["RASCUNHO", "ENVIADA", "EM_ANALISE", "ACEITA", "RECUSADA", "EXPIRADA", "CANCELADA"];
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

const CORES: Record<string, string> = {
  RASCUNHO: "bg-paper text-ink-soft",
  ENVIADA: "bg-amber-100 text-amber-800",
  EM_ANALISE: "bg-amber-100 text-amber-800",
  ACEITA: "bg-brass/15 text-brass-deep",
  RECUSADA: "bg-urgent-bg text-urgent",
  EXPIRADA: "bg-urgent-bg text-urgent",
  CANCELADA: "bg-urgent-bg text-urgent",
};

export function PropostasClient({
  propostas,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  propostas: PropostaView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: PropostaView } | null>(null);
  const [pending, start] = useTransition();

  function mudarStatus(id: string, status: string) {
    const fd = new FormData();
    fd.set("propostaId", id);
    fd.set("status", status);
    start(async () => {
      await mudarStatusProposta(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Nova proposta
          </button>
        </div>
      )}

      {propostas.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma proposta.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {propostas.map((p) => (
                <tr key={p.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">{formatarData(p.data)}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.imovelCodigo ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.clienteNome ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{centavosParaReais(p.valorProposto)}</td>
                  <td className="px-4 py-3">
                    {podeEditar ? (
                      <select
                        value={p.status}
                        disabled={pending}
                        onChange={(e) => mudarStatus(p.id, e.target.value)}
                        className={`rounded-full px-2 py-0.5 text-xs outline-none ${CORES[p.status] ?? ""}`}
                      >
                        {STATUS.map((s) => (
                          <option key={s} value={s}>
                            {ROTULO_STATUS_PROPOSTA[s] ?? s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${CORES[p.status] ?? ""}`}>
                        {ROTULO_STATUS_PROPOSTA[p.status] ?? p.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/imob/propostas/${p.id}`} className="text-ink-soft hover:text-ink hover:underline">
                        Histórico
                      </Link>
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => setForm({ tipo: "editar", item: p })}
                          className="text-ink-soft hover:text-ink hover:underline"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <ModalProposta
          item={form.tipo === "editar" ? form.item : null}
          opcoes={opcoes}
          onFechar={() => setForm(null)}
        />
      )}
    </div>
  );
}

function ModalProposta({
  item,
  opcoes,
  onFechar,
}: {
  item: PropostaView | null;
  opcoes: Opcoes;
  onFechar: () => void;
}) {
  const editando = item !== null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarProposta(fd) : await criarProposta(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo={editando ? "Editar proposta" : "Nova proposta"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <CampoSelect
          rotulo="Imóvel"
          name="imovelId"
          opcoes={paraOpcoes(opcoes.imoveis)}
          incluirVazio="Selecione…"
          required
          defaultValue={item?.imovelId}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            rotulo="Cliente"
            name="clienteId"
            opcoes={paraOpcoes(opcoes.clientes)}
            incluirVazio="Nenhum"
            defaultValue={item?.clienteId ?? ""}
          />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
            defaultValue={item?.corretorId ?? ""}
          />
          <Campo
            rotulo="Valor proposto (R$)"
            name="valorProposto"
            defaultValue={centavosParaInput(item?.valorProposto)}
            placeholder="0,00"
            required
          />
          <Campo
            rotulo="Valor solicitado (R$)"
            name="valorSolicitado"
            defaultValue={centavosParaInput(item?.valorSolicitado)}
            placeholder="0,00"
          />
          <Campo
            rotulo="Entrada (R$)"
            name="entrada"
            defaultValue={centavosParaInput(item?.entrada)}
            placeholder="0,00"
          />
          <Campo rotulo="Forma de pagamento" name="formaPagamento" defaultValue={item?.formaPagamento} />
          <Campo rotulo="Validade" name="validade" type="date" defaultValue={item?.validade ?? undefined} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="financiamento" defaultChecked={item?.financiamento} /> Financiamento
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permuta" defaultChecked={item?.permuta} /> Permuta
          </label>
        </div>
        <CampoTextarea rotulo="Observações" name="observacoes" defaultValue={item?.observacoes} />
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
