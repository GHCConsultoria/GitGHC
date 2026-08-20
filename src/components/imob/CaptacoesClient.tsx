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
import { criarCaptacao, editarCaptacao } from "@/lib/imob/acoes-crm";
import { ROTULO_STATUS_CAPTACAO } from "@/lib/imob/rotulos";

export interface CaptacaoView {
  id: string;
  status: string;
  origem: string | null;
  exclusividade: boolean;
  comissaoPercentual: number | null;
  dataCaptacao: string | null;
  validadeExclusividade: string | null;
  observacoes: string | null;
  proprietarioId: string | null;
  imovelId: string | null;
  corretorId: string | null;
  imovelCodigo: string | null;
  proprietarioNome: string | null;
  corretorNome: string | null;
}

interface Opcoes {
  proprietarios: Array<{ id: string; nome: string }>;
  imoveis: Array<{ id: string; nome: string }>;
  corretores: Array<{ id: string; nome: string }>;
}

const STATUS = [
  "PROSPECTADO",
  "CONTATO_REALIZADO",
  "VISITA_CAPTACAO",
  "DOCUMENTACAO",
  "CONTRATO",
  "ATIVO",
  "ENCERRADO",
];
const opcStatus = STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_CAPTACAO[s] ?? s }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

export function CaptacoesClient({
  captacoes,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  captacoes: CaptacaoView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: CaptacaoView } | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Nova captação
          </button>
        </div>
      )}

      {captacoes.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma captação.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Proprietário</th>
                <th className="px-4 py-3 font-medium">Corretor</th>
                <th className="px-4 py-3 font-medium">Exclusiva</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {captacoes.map((c) => (
                <tr key={c.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 text-ink-soft">{c.imovelCodigo ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.proprietarioNome ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.corretorNome ?? "—"}</td>
                  <td className="px-4 py-3">{c.exclusividade ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
                      {ROTULO_STATUS_CAPTACAO[c.status] ?? c.status}
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
        <ModalCaptacao
          item={form.tipo === "editar" ? form.item : null}
          opcoes={opcoes}
          onFechar={() => setForm(null)}
        />
      )}
    </div>
  );
}

function ModalCaptacao({
  item,
  opcoes,
  onFechar,
}: {
  item: CaptacaoView | null;
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
      const r = editando ? await editarCaptacao(fd) : await criarCaptacao(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo={editando ? "Editar captação" : "Nova captação"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            rotulo="Proprietário"
            name="proprietarioId"
            opcoes={paraOpcoes(opcoes.proprietarios)}
            incluirVazio="Nenhum"
            defaultValue={item?.proprietarioId ?? ""}
          />
          <CampoSelect
            rotulo="Imóvel"
            name="imovelId"
            opcoes={paraOpcoes(opcoes.imoveis)}
            incluirVazio="Nenhum"
            defaultValue={item?.imovelId ?? ""}
          />
          <CampoSelect
            rotulo="Corretor captador"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
            defaultValue={item?.corretorId ?? ""}
          />
          <CampoSelect rotulo="Status" name="status" opcoes={opcStatus} defaultValue={item?.status ?? "PROSPECTADO"} />
          <Campo
            rotulo="Data da captação"
            name="dataCaptacao"
            type="date"
            defaultValue={item?.dataCaptacao ?? undefined}
          />
          <Campo rotulo="Origem" name="origem" defaultValue={item?.origem} />
          <Campo
            rotulo="Comissão acordada (%)"
            name="comissaoPercentual"
            type="number"
            defaultValue={item?.comissaoPercentual}
          />
          <Campo
            rotulo="Validade da exclusividade"
            name="validadeExclusividade"
            type="date"
            defaultValue={item?.validadeExclusividade ?? undefined}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="exclusividade" defaultChecked={item?.exclusividade} />
          <span>Exclusividade</span>
        </label>
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
