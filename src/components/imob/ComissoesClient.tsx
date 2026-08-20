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
import { criarComissao, gerarComissoesDaVenda, mudarStatusComissao } from "@/lib/imob/acoes-financeiro";
import { centavosParaReais } from "@/lib/imob/formato";
import { ROTULO_STATUS_COMISSAO, ROTULO_TIPO_COMISSAO } from "@/lib/imob/rotulos";

export interface ComissaoView {
  id: string;
  tipo: string;
  status: string;
  percentual: number | null;
  valorPrevisto: number;
  valorAprovado: number | null;
  valorPago: number | null;
  corretorNome: string | null;
}

interface Opcoes {
  corretores: Array<{ id: string; nome: string }>;
  vendas: Array<{ id: string; nome: string }>;
}

const TIPOS = ["CORRETOR_VENDEDOR", "CORRETOR_CAPTADOR", "GERENTE", "IMOBILIARIA"].map((t) => ({
  valor: t,
  rotulo: ROTULO_TIPO_COMISSAO[t] ?? t,
}));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

const CORES: Record<string, string> = {
  PREVISTA: "bg-paper text-ink-soft",
  APROVADA: "bg-amber-100 text-amber-800",
  PAGA: "bg-brass/15 text-brass-deep",
  CANCELADA: "bg-urgent-bg text-urgent",
};

// próximo status no fluxo prevista → aprovada → paga
const PROXIMO: Record<string, { status: string; rotulo: string } | null> = {
  PREVISTA: { status: "APROVADA", rotulo: "Aprovar" },
  APROVADA: { status: "PAGA", rotulo: "Pagar" },
  PAGA: null,
  CANCELADA: null,
};

export function ComissoesClient({
  comissoes,
  opcoes,
  podeCriar,
  podeEditar,
}: {
  comissoes: ComissaoView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeEditar: boolean;
}) {
  const [modal, setModal] = useState<"nova" | "gerar" | null>(null);
  const [pending, start] = useTransition();

  function avancar(id: string, status: string) {
    const fd = new FormData();
    fd.set("comissaoId", id);
    fd.set("status", status);
    start(async () => {
      await mudarStatusComissao(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setModal("gerar")} className={CLASSE_BOTAO_NEUTRO}>
            Gerar de uma venda
          </button>
          <button type="button" onClick={() => setModal("nova")} className={CLASSE_BOTAO_PRIMARIO}>
            + Nova comissão
          </button>
        </div>
      )}

      {comissoes.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma comissão.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Beneficiário</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Prevista</th>
                <th className="px-4 py-3 font-medium">Paga</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {comissoes.map((c) => {
                const proximo = PROXIMO[c.status];
                return (
                  <tr key={c.id} className="border-b border-rule/60 last:border-0">
                    <td className="px-4 py-3">{c.corretorNome ?? ROTULO_TIPO_COMISSAO[c.tipo] ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">{ROTULO_TIPO_COMISSAO[c.tipo] ?? c.tipo}</td>
                    <td className="px-4 py-3 font-medium">{centavosParaReais(c.valorPrevisto)}</td>
                    <td className="px-4 py-3 text-ink-soft">{centavosParaReais(c.valorPago) || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${CORES[c.status] ?? ""}`}>
                        {ROTULO_STATUS_COMISSAO[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {podeEditar && proximo && (
                        <button
                          type="button"
                          onClick={() => avancar(c.id, proximo.status)}
                          disabled={pending}
                          className="text-ink-soft hover:text-ink hover:underline disabled:opacity-50"
                        >
                          {proximo.rotulo}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === "nova" && <ModalNova opcoes={opcoes} onFechar={() => setModal(null)} />}
      {modal === "gerar" && <ModalGerar opcoes={opcoes} onFechar={() => setModal(null)} />}
    </div>
  );
}

function ModalNova({ opcoes, onFechar }: { opcoes: Opcoes; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await criarComissao(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Nova comissão" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Tipo" name="tipo" opcoes={TIPOS} defaultValue="CORRETOR_VENDEDOR" />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
          />
          <CampoSelect rotulo="Venda" name="vendaId" opcoes={paraOpcoes(opcoes.vendas)} incluirVazio="Nenhuma" />
          <Campo rotulo="Valor previsto (R$)" name="valorPrevisto" placeholder="0,00" required />
          <Campo rotulo="Percentual (%)" name="percentual" type="number" />
        </div>
        <Campo rotulo="Descrição" name="descricao" />
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

function ModalGerar({ opcoes, onFechar }: { opcoes: Opcoes; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await gerarComissoesDaVenda(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Gerar comissões de uma venda" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <CampoSelect
          rotulo="Venda"
          name="vendaId"
          opcoes={paraOpcoes(opcoes.vendas)}
          incluirVazio="Selecione…"
          required
        />
        <Campo rotulo="Comissão total (%)" name="percentualTotal" type="number" defaultValue={6} required />
        <p className="eyebrow">Distribuição (deve somar 100%)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Corretor vendedor (%)" name="pctCorretorVendedor" type="number" defaultValue={50} />
          <Campo rotulo="Corretor captador (%)" name="pctCorretorCaptador" type="number" defaultValue={0} />
          <Campo rotulo="Gerente (%)" name="pctGerente" type="number" defaultValue={0} />
          <Campo rotulo="Imobiliária (%)" name="pctImobiliaria" type="number" defaultValue={50} />
        </div>
        <Mensagem erro={erro} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={CLASSE_BOTAO_NEUTRO}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "Gerando…" : "Gerar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
