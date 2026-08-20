"use client";

import { useState, useTransition } from "react";
import { Campo, CLASSE_BOTAO_NEUTRO, CLASSE_BOTAO_PRIMARIO, Mensagem, Modal } from "@/components/imob/primitivos";
import { arquivarCorretor, criarCorretor, editarCorretor } from "@/lib/imob/acoes-crm";
import { centavosParaInput, centavosParaReais } from "@/lib/imob/formato";

export interface CorretorView {
  id: string;
  nome: string;
  cpf: string | null;
  creci: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  metaMensal: number | null;
  percentualComissao: number | null;
  ativo: boolean;
  leads: number;
  visitas: number;
  captacoes: number;
}

interface Props {
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  corretores: CorretorView[];
}

export function CorretoresClient({ podeCriar, podeEditar, podeExcluir, corretores }: Props) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: CorretorView } | null>(null);
  const [pending, start] = useTransition();

  function arquivar(item: CorretorView) {
    if (!confirm(`Arquivar o corretor "${item.nome}"?`)) return;
    const fd = new FormData();
    fd.set("id", item.id);
    start(async () => {
      await arquivarCorretor(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo corretor
          </button>
        </div>
      )}

      {corretores.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhum corretor cadastrado.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {corretores.map((c) => (
            <div key={c.id} className={`paper-card rounded-md p-5 ${c.ativo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg">{c.nome}</h2>
                  <p className="text-xs text-ink-soft">CRECI {c.creci || "—"}</p>
                </div>
                {!c.ativo && <span className="eyebrow rounded-sm bg-paper px-2 py-1">Inativo</span>}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <Kpi rotulo="Leads" valor={c.leads} />
                <Kpi rotulo="Visitas" valor={c.visitas} />
                <Kpi rotulo="Captações" valor={c.captacoes} />
              </dl>
              <p className="mt-3 text-xs text-ink-soft">
                Meta: {centavosParaReais(c.metaMensal) || "—"} · Comissão: {c.percentualComissao ?? "—"}%
              </p>
              <div className="mt-3 flex gap-3 text-sm">
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => setForm({ tipo: "editar", item: c })}
                    className="text-ink-soft hover:text-ink hover:underline"
                  >
                    Editar
                  </button>
                )}
                {podeExcluir && c.ativo && (
                  <button
                    type="button"
                    onClick={() => arquivar(c)}
                    disabled={pending}
                    className="text-ink-soft hover:text-urgent hover:underline disabled:opacity-50"
                  >
                    Arquivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && <ModalCorretor item={form.tipo === "editar" ? form.item : null} onFechar={() => setForm(null)} />}
    </div>
  );
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-sm bg-paper py-2">
      <p className="font-display text-lg">{valor}</p>
      <p className="text-xs text-ink-faint">{rotulo}</p>
    </div>
  );
}

function ModalCorretor({ item, onFechar }: { item: CorretorView | null; onFechar: () => void }) {
  const editando = item !== null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarCorretor(fd) : await criarCorretor(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }

  return (
    <Modal titulo={editando ? "Editar corretor" : "Novo corretor"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Nome" name="nome" defaultValue={item?.nome} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="CPF" name="cpf" defaultValue={item?.cpf} />
          <Campo rotulo="CRECI" name="creci" defaultValue={item?.creci} />
          <Campo rotulo="E-mail" name="email" type="email" defaultValue={item?.email} />
          <Campo rotulo="Telefone" name="telefone" defaultValue={item?.telefone} />
          <Campo rotulo="WhatsApp" name="whatsapp" defaultValue={item?.whatsapp} />
          <Campo rotulo="Data de entrada" name="dataEntrada" type="date" />
          <Campo
            rotulo="Meta mensal (R$)"
            name="metaMensal"
            defaultValue={centavosParaInput(item?.metaMensal)}
            placeholder="0,00"
          />
          <Campo
            rotulo="Comissão (%)"
            name="percentualComissao"
            type="number"
            defaultValue={item?.percentualComissao}
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
