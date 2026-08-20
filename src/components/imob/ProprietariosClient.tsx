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
import { arquivarProprietario, criarProprietario, editarProprietario } from "@/lib/imob/acoes-cadastros";
import { ROTULO_TIPO_PESSOA } from "@/lib/imob/rotulos";

interface ProprietarioView {
  id: string;
  nome: string;
  tipoPessoa: "FISICA" | "JURIDICA";
  documento: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  observacoes: string | null;
  totalImoveis: number;
}

interface Props {
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  proprietarios: ProprietarioView[];
}

const OPCOES_PESSOA = Object.entries(ROTULO_TIPO_PESSOA).map(([valor, rotulo]) => ({ valor, rotulo }));

export function ProprietariosClient({ podeCriar, podeEditar, podeExcluir, proprietarios }: Props) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: ProprietarioView } | null>(null);
  const [pending, start] = useTransition();

  function arquivar(item: ProprietarioView) {
    if (!confirm(`Arquivar o proprietário "${item.nome}"? Ele deixa de aparecer nas listas.`)) return;
    const fd = new FormData();
    fd.set("id", item.id);
    start(async () => {
      await arquivarProprietario(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo proprietário
          </button>
        </div>
      )}

      {proprietarios.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">
          Nenhum proprietário encontrado.
        </div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Imóveis</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {proprietarios.map((p) => (
                <tr key={p.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.documento || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.telefone || p.email || "—"}</td>
                  <td className="px-4 py-3">{p.totalImoveis}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => setForm({ tipo: "editar", item: p })}
                          className="text-ink-soft hover:text-ink hover:underline"
                        >
                          Editar
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={() => arquivar(p)}
                          disabled={pending}
                          className="text-ink-soft hover:text-urgent hover:underline disabled:opacity-50"
                        >
                          Arquivar
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

      {form && <ModalProprietario item={form.tipo === "editar" ? form.item : null} onFechar={() => setForm(null)} />}
    </div>
  );
}

function ModalProprietario({ item, onFechar }: { item: ProprietarioView | null; onFechar: () => void }) {
  const editando = item !== null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarProprietario(fd) : await criarProprietario(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }

  return (
    <Modal titulo={editando ? "Editar proprietário" : "Novo proprietário"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Nome" name="nome" defaultValue={item?.nome} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            rotulo="Tipo de pessoa"
            name="tipoPessoa"
            opcoes={OPCOES_PESSOA}
            defaultValue={item?.tipoPessoa ?? "FISICA"}
          />
          <Campo rotulo="CPF/CNPJ" name="documento" defaultValue={item?.documento} />
          <Campo rotulo="E-mail" name="email" type="email" defaultValue={item?.email} />
          <Campo rotulo="Telefone" name="telefone" defaultValue={item?.telefone} />
          <Campo rotulo="WhatsApp" name="whatsapp" defaultValue={item?.whatsapp} />
          <Campo rotulo="Endereço" name="endereco" defaultValue={item?.endereco} />
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
