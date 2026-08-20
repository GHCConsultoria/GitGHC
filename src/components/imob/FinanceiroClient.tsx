"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Campo,
  CampoSelect,
  CLASSE_BOTAO_NEUTRO,
  CLASSE_BOTAO_PRIMARIO,
  Mensagem,
  Modal,
} from "@/components/imob/primitivos";
import { criarLancamento, editarLancamento, marcarLancamentoPago } from "@/lib/imob/acoes-financeiro";
import { centavosParaInput, centavosParaReais, formatarData } from "@/lib/imob/formato";
import { ROTULO_STATUS_LANCAMENTO, ROTULO_TIPO_LANCAMENTO } from "@/lib/imob/rotulos";

export interface LancamentoView {
  id: string;
  tipo: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  vencimento: string;
  status: string;
  vencido: boolean;
  formaPagamento: string | null;
  centroCusto: string | null;
  clienteId: string | null;
  imovelId: string | null;
  contratoId: string | null;
  corretorId: string | null;
  clienteNome: string | null;
  imovelCodigo: string | null;
}

interface Opcoes {
  clientes: Array<{ id: string; nome: string }>;
  imoveis: Array<{ id: string; nome: string }>;
  corretores: Array<{ id: string; nome: string }>;
}

const TIPOS = ["RECEBER", "PAGAR"].map((t) => ({ valor: t, rotulo: ROTULO_TIPO_LANCAMENTO[t] ?? t }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

export function FinanceiroClient({
  lancamentos,
  filtroAtual,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  lancamentos: LancamentoView[];
  filtroAtual: string;
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: LancamentoView } | null>(null);
  const [pending, start] = useTransition();

  function togglePago(id: string) {
    const fd = new FormData();
    fd.set("lancamentoId", id);
    start(async () => {
      await marcarLancamentoPago(fd);
    });
  }

  const filtros = [
    { chave: "", rotulo: "Todos" },
    { chave: "RECEBER", rotulo: "A receber" },
    { chave: "PAGAR", rotulo: "A pagar" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-sm border border-rule p-1 text-sm">
          {filtros.map((f) => (
            <Link
              key={f.chave}
              href={f.chave ? `/imob/financeiro?tipo=${f.chave}` : "/imob/financeiro"}
              className={`rounded-sm px-3 py-1 ${filtroAtual === f.chave ? "bg-brass text-brass-on" : "text-ink-soft"}`}
            >
              {f.rotulo}
            </Link>
          ))}
        </div>
        {podeCriar && (
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo lançamento
          </button>
        )}
      </div>

      {lancamentos.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhum lançamento.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.descricao}</p>
                    {l.categoria && <p className="text-xs text-ink-faint">{l.categoria}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{ROTULO_TIPO_LANCAMENTO[l.tipo] ?? l.tipo}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatarData(l.vencimento)}
                    {l.vencido && <span className="ml-2 text-xs font-medium text-urgent">vencido</span>}
                  </td>
                  <td className={`px-4 py-3 font-medium ${l.tipo === "PAGAR" ? "text-urgent" : ""}`}>
                    {l.tipo === "PAGAR" ? "-" : "+"} {centavosParaReais(l.valor)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${l.status === "PAGO" ? "bg-brass/15 text-brass-deep" : "bg-paper text-ink-soft"}`}
                    >
                      {ROTULO_STATUS_LANCAMENTO[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {podeEditar && l.status !== "CANCELADO" && (
                        <button
                          type="button"
                          onClick={() => togglePago(l.id)}
                          disabled={pending}
                          className="text-ink-soft hover:text-ink hover:underline disabled:opacity-50"
                        >
                          {l.status === "PAGO" ? "Reabrir" : "Marcar pago"}
                        </button>
                      )}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => setForm({ tipo: "editar", item: l })}
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
        <ModalLancamento
          item={form.tipo === "editar" ? form.item : null}
          opcoes={opcoes}
          onFechar={() => setForm(null)}
        />
      )}
    </div>
  );
}

function ModalLancamento({
  item,
  opcoes,
  onFechar,
}: {
  item: LancamentoView | null;
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
      const r = editando ? await editarLancamento(fd) : await criarLancamento(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo={editando ? "Editar lançamento" : "Novo lançamento"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Tipo" name="tipo" opcoes={TIPOS} defaultValue={item?.tipo ?? "RECEBER"} />
          <Campo
            rotulo="Valor (R$)"
            name="valor"
            defaultValue={centavosParaInput(item?.valor)}
            placeholder="0,00"
            required
          />
        </div>
        <Campo rotulo="Descrição" name="descricao" defaultValue={item?.descricao} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Categoria" name="categoria" defaultValue={item?.categoria} />
          <Campo rotulo="Centro de custo" name="centroCusto" defaultValue={item?.centroCusto} />
          <Campo rotulo="Vencimento" name="vencimento" type="date" defaultValue={item?.vencimento} required />
          <Campo rotulo="Forma de pagamento" name="formaPagamento" defaultValue={item?.formaPagamento} />
          <CampoSelect
            rotulo="Cliente"
            name="clienteId"
            opcoes={paraOpcoes(opcoes.clientes)}
            incluirVazio="Nenhum"
            defaultValue={item?.clienteId ?? ""}
          />
          <CampoSelect
            rotulo="Imóvel"
            name="imovelId"
            opcoes={paraOpcoes(opcoes.imoveis)}
            incluirVazio="Nenhum"
            defaultValue={item?.imovelId ?? ""}
          />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
            defaultValue={item?.corretorId ?? ""}
          />
        </div>
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
