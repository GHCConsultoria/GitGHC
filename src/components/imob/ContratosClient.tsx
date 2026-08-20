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
import { criarContrato, editarContrato } from "@/lib/imob/acoes-fin";
import { formatarData } from "@/lib/imob/formato";
import { ROTULO_STATUS_CONTRATO, ROTULO_TIPO_CONTRATO } from "@/lib/imob/rotulos";

export interface ContratoView {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  imovelId: string | null;
  clienteId: string | null;
  proprietarioId: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  observacoes: string | null;
  documentos: number;
  // faixa de alerta (0 = vencido, 1/7/15/30 = dias) ou null
  faixa: number | null;
  diasRestantes: number | null;
}

interface Opcoes {
  imoveis: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  proprietarios: Array<{ id: string; nome: string }>;
}

const TIPOS = ["ADMINISTRACAO", "LOCACAO", "COMPRA_VENDA", "CAPTACAO", "PRESTACAO_SERVICOS"];
const STATUS = ["ATIVO", "ENCERRADO", "CANCELADO"];
const opcTipo = TIPOS.map((t) => ({ valor: t, rotulo: ROTULO_TIPO_CONTRATO[t] ?? t }));
const opcStatus = STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_CONTRATO[s] ?? s }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

function corAlerta(faixa: number | null): string {
  if (faixa === null) return "";
  if (faixa === 0 || faixa === 1) return "text-urgent";
  if (faixa <= 7) return "text-amber-700";
  return "text-amber-600";
}

function textoAlerta(faixa: number | null, dias: number | null): string {
  if (faixa === null || dias === null) return "";
  if (dias < 0) return `vencido há ${Math.abs(dias)}d`;
  if (dias === 0) return "vence hoje";
  return `vence em ${dias}d`;
}

export function ContratosClient({
  contratos,
  vencendo,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  contratos: ContratoView[];
  vencendo: ContratoView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: ContratoView } | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {vencendo.length > 0 && (
        <section className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="eyebrow text-amber-800">Alertas de vencimento ({vencendo.length})</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {vencendo.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <Link href={`/imob/contratos/${c.id}`} className="text-amber-900 hover:underline">
                  {c.titulo} · {ROTULO_TIPO_CONTRATO[c.tipo] ?? c.tipo}
                </Link>
                <span className={`text-xs font-medium ${corAlerta(c.faixa)}`}>
                  {textoAlerta(c.faixa, c.diasRestantes)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo contrato
          </button>
        </div>
      )}

      {contratos.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhum contrato.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr key={c.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/imob/contratos/${c.id}`} className="font-medium hover:underline">
                      {c.titulo}
                    </Link>
                    {c.documentos > 0 && <span className="ml-2 text-xs text-ink-faint">{c.documentos} doc</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{ROTULO_TIPO_CONTRATO[c.tipo] ?? c.tipo}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.dataFim ? formatarData(c.dataFim) : "—"}
                    {c.faixa !== null && (
                      <span className={`ml-2 text-xs font-medium ${corAlerta(c.faixa)}`}>
                        {textoAlerta(c.faixa, c.diasRestantes)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
                      {ROTULO_STATUS_CONTRATO[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => setForm({ tipo: "editar", item: c })}
                        className="text-ink-soft hover:text-ink hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <ModalContrato
          item={form.tipo === "editar" ? form.item : null}
          opcoes={opcoes}
          onFechar={() => setForm(null)}
        />
      )}
    </div>
  );
}

function ModalContrato({
  item,
  opcoes,
  onFechar,
}: {
  item: ContratoView | null;
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
      const r = editando ? await editarContrato(fd) : await criarContrato(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo={editando ? "Editar contrato" : "Novo contrato"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Título" name="titulo" defaultValue={item?.titulo} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            rotulo="Tipo"
            name="tipo"
            opcoes={opcTipo}
            incluirVazio="Selecione…"
            required
            defaultValue={item?.tipo}
          />
          <CampoSelect rotulo="Status" name="status" opcoes={opcStatus} defaultValue={item?.status ?? "ATIVO"} />
          <CampoSelect
            rotulo="Imóvel"
            name="imovelId"
            opcoes={paraOpcoes(opcoes.imoveis)}
            incluirVazio="Nenhum"
            defaultValue={item?.imovelId ?? ""}
          />
          <CampoSelect
            rotulo="Cliente"
            name="clienteId"
            opcoes={paraOpcoes(opcoes.clientes)}
            incluirVazio="Nenhum"
            defaultValue={item?.clienteId ?? ""}
          />
          <CampoSelect
            rotulo="Proprietário"
            name="proprietarioId"
            opcoes={paraOpcoes(opcoes.proprietarios)}
            incluirVazio="Nenhum"
            defaultValue={item?.proprietarioId ?? ""}
          />
          <Campo rotulo="Data de início" name="dataInicio" type="date" defaultValue={item?.dataInicio ?? undefined} />
          <Campo rotulo="Data de fim" name="dataFim" type="date" defaultValue={item?.dataFim ?? undefined} />
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
