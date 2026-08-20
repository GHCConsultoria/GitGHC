"use client";

import { useState, useTransition } from "react";
import {
  Campo,
  CampoSelect,
  CLASSE_BOTAO_NEUTRO,
  CLASSE_BOTAO_PRIMARIO,
  Mensagem,
  Modal,
} from "@/components/imob/primitivos";
import { criarLocacao, editarLocacao } from "@/lib/imob/acoes-fin";
import { centavosParaInput, centavosParaReais } from "@/lib/imob/formato";
import { ROTULO_STATUS_LOCACAO } from "@/lib/imob/rotulos";

export interface LocacaoView {
  id: string;
  imovelId: string;
  proprietarioId: string | null;
  locatarioId: string | null;
  corretorId: string | null;
  fiadorNome: string | null;
  valorAluguel: number;
  condominio: number | null;
  iptu: number | null;
  seguro: number | null;
  caucao: number | null;
  dataInicial: string;
  dataFinal: string | null;
  diaVencimento: number | null;
  indiceReajuste: string | null;
  status: string;
  imovelCodigo: string | null;
  locatarioNome: string | null;
  proprietarioNome: string | null;
}

interface Opcoes {
  imoveis: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  proprietarios: Array<{ id: string; nome: string }>;
  corretores: Array<{ id: string; nome: string }>;
}

const STATUS = ["ATIVO", "ENCERRADO", "RESCINDIDO", "INADIMPLENTE"];
const opcStatus = STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_LOCACAO[s] ?? s }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

const CORES: Record<string, string> = {
  ATIVO: "bg-brass/15 text-brass-deep",
  ENCERRADO: "bg-paper text-ink-soft",
  RESCINDIDO: "bg-urgent-bg text-urgent",
  INADIMPLENTE: "bg-urgent-bg text-urgent",
};

export function LocacoesClient({
  locacoes,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  locacoes: LocacaoView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: LocacaoView } | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Nova locação
          </button>
        </div>
      )}

      {locacoes.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma locação.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Locatário</th>
                <th className="px-4 py-3 font-medium">Aluguel</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {locacoes.map((l) => (
                <tr key={l.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 text-ink-soft">{l.imovelCodigo ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.locatarioNome ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{centavosParaReais(l.valorAluguel)}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.diaVencimento ? `dia ${l.diaVencimento}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${CORES[l.status] ?? ""}`}>
                      {ROTULO_STATUS_LOCACAO[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => setForm({ tipo: "editar", item: l })}
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
        <ModalLocacao item={form.tipo === "editar" ? form.item : null} opcoes={opcoes} onFechar={() => setForm(null)} />
      )}
    </div>
  );
}

function ModalLocacao({ item, opcoes, onFechar }: { item: LocacaoView | null; opcoes: Opcoes; onFechar: () => void }) {
  const editando = item !== null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarLocacao(fd) : await criarLocacao(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo={editando ? "Editar locação" : "Nova locação"} onFechar={onFechar} largura="max-w-2xl">
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
            rotulo="Locatário"
            name="locatarioId"
            opcoes={paraOpcoes(opcoes.clientes)}
            incluirVazio="Nenhum"
            defaultValue={item?.locatarioId ?? ""}
          />
          <CampoSelect
            rotulo="Proprietário"
            name="proprietarioId"
            opcoes={paraOpcoes(opcoes.proprietarios)}
            incluirVazio="Nenhum"
            defaultValue={item?.proprietarioId ?? ""}
          />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
            defaultValue={item?.corretorId ?? ""}
          />
          <Campo rotulo="Fiador" name="fiadorNome" defaultValue={item?.fiadorNome} />
          <Campo
            rotulo="Aluguel (R$)"
            name="valorAluguel"
            defaultValue={centavosParaInput(item?.valorAluguel)}
            placeholder="0,00"
            required
          />
          <Campo
            rotulo="Condomínio (R$)"
            name="condominio"
            defaultValue={centavosParaInput(item?.condominio)}
            placeholder="0,00"
          />
          <Campo rotulo="IPTU (R$)" name="iptu" defaultValue={centavosParaInput(item?.iptu)} placeholder="0,00" />
          <Campo rotulo="Seguro (R$)" name="seguro" defaultValue={centavosParaInput(item?.seguro)} placeholder="0,00" />
          <Campo rotulo="Caução (R$)" name="caucao" defaultValue={centavosParaInput(item?.caucao)} placeholder="0,00" />
          <Campo
            rotulo="Data inicial"
            name="dataInicial"
            type="date"
            defaultValue={item?.dataInicial ?? undefined}
            required
          />
          <Campo rotulo="Data final" name="dataFinal" type="date" defaultValue={item?.dataFinal ?? undefined} />
          <Campo rotulo="Dia de vencimento" name="diaVencimento" type="number" defaultValue={item?.diaVencimento} />
          <Campo
            rotulo="Índice de reajuste"
            name="indiceReajuste"
            defaultValue={item?.indiceReajuste}
            placeholder="IGPM, IPCA…"
          />
          <CampoSelect rotulo="Status" name="status" opcoes={opcStatus} defaultValue={item?.status ?? "ATIVO"} />
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
