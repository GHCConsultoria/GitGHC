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
import { criarVenda } from "@/lib/imob/acoes-fin";
import { centavosParaReais, formatarData } from "@/lib/imob/formato";

export interface VendaView {
  id: string;
  data: string;
  valorVenda: number;
  comissaoValor: number | null;
  imovelCodigo: string | null;
  clienteNome: string | null;
  corretorNome: string | null;
}

interface Opcoes {
  imoveis: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  proprietarios: Array<{ id: string; nome: string }>;
  corretores: Array<{ id: string; nome: string }>;
}

const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

export function VendasClient({
  vendas,
  opcoes,
  podeCriar,
}: {
  vendas: VendaView[];
  opcoes: Opcoes;
  podeCriar: boolean;
}) {
  const [criando, setCriando] = useState(false);
  const total = vendas.reduce((s, v) => s + v.valorVenda, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {vendas.length} venda(s) · total {centavosParaReais(total)}
        </p>
        {podeCriar && (
          <button type="button" onClick={() => setCriando(true)} className={CLASSE_BOTAO_PRIMARIO}>
            + Registrar venda
          </button>
        )}
      </div>

      {vendas.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma venda registrada.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Imóvel</th>
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Corretor</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">{formatarData(v.data)}</td>
                  <td className="px-4 py-3 text-ink-soft">{v.imovelCodigo ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{v.clienteNome ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{v.corretorNome ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{centavosParaReais(v.valorVenda)}</td>
                  <td className="px-4 py-3 text-ink-soft">{centavosParaReais(v.comissaoValor) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {criando && <ModalVenda opcoes={opcoes} onFechar={() => setCriando(false)} />}
    </div>
  );
}

function ModalVenda({ opcoes, onFechar }: { opcoes: Opcoes; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await criarVenda(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Registrar venda" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <CampoSelect
          rotulo="Imóvel"
          name="imovelId"
          opcoes={paraOpcoes(opcoes.imoveis)}
          incluirVazio="Selecione…"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Comprador" name="clienteId" opcoes={paraOpcoes(opcoes.clientes)} incluirVazio="Nenhum" />
          <CampoSelect
            rotulo="Proprietário"
            name="proprietarioId"
            opcoes={paraOpcoes(opcoes.proprietarios)}
            incluirVazio="Nenhum"
          />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Nenhum"
          />
          <Campo rotulo="Valor da venda (R$)" name="valorVenda" placeholder="0,00" required />
          <Campo rotulo="Comissão (R$)" name="comissaoValor" placeholder="0,00" />
          <Campo rotulo="Data" name="data" type="date" />
          <Campo rotulo="Forma de pagamento" name="formaPagamento" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="financiamento" /> Financiamento
        </label>
        <CampoTextarea rotulo="Observações" name="observacoes" />
        <p className="text-xs text-ink-faint">Ao registrar, o imóvel passa para o status “Vendido”.</p>
        <Mensagem erro={erro} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={CLASSE_BOTAO_NEUTRO}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
