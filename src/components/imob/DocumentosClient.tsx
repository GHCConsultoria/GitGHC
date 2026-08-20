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
import { criarDocumento, removerDocumento } from "@/lib/imob/acoes-conteudo";
import { formatarData } from "@/lib/imob/formato";
import { ROTULO_TIPO_DOCUMENTO } from "@/lib/imob/rotulos";

export interface DocumentoView {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  validade: string | null;
  vinculoNome: string | null;
}

interface Opcoes {
  clientes: Array<{ id: string; nome: string }>;
  proprietarios: Array<{ id: string; nome: string }>;
  imoveis: Array<{ id: string; nome: string }>;
  contratos: Array<{ id: string; nome: string }>;
}

const TIPOS = Object.entries(ROTULO_TIPO_DOCUMENTO).map(([valor, rotulo]) => ({ valor, rotulo }));
const paraOpcoes = (l: Array<{ id: string; nome: string }>) => l.map((x) => ({ valor: x.id, rotulo: x.nome }));

export function DocumentosClient({
  documentos,
  opcoes,
  podeCriar,
  podeExcluir,
}: {
  documentos: DocumentoView[];
  opcoes: Opcoes;
  podeCriar: boolean;
  podeExcluir: boolean;
}) {
  const [criando, setCriando] = useState(false);
  const [pending, start] = useTransition();

  function remover(id: string) {
    if (!confirm("Remover este documento?")) return;
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await removerDocumento(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setCriando(true)} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo documento
          </button>
        </div>
      )}

      {documentos.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhum documento.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Vínculo</th>
                <th className="px-4 py-3 font-medium">Validade</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {d.nome}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{ROTULO_TIPO_DOCUMENTO[d.tipo] ?? d.tipo}</td>
                  <td className="px-4 py-3 text-ink-soft">{d.vinculoNome ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{d.validade ? formatarData(d.validade) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {podeExcluir && (
                      <button
                        type="button"
                        onClick={() => remover(d.id)}
                        disabled={pending}
                        className="text-ink-soft hover:text-urgent hover:underline disabled:opacity-50"
                      >
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {criando && <ModalDocumento opcoes={opcoes} onFechar={() => setCriando(false)} />}
    </div>
  );
}

function ModalDocumento({ opcoes, onFechar }: { opcoes: Opcoes; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await criarDocumento(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }
  return (
    <Modal titulo="Novo documento" onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Campo rotulo="Nome" name="nome" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Tipo" name="tipo" opcoes={TIPOS} defaultValue="OUTROS" />
          <Campo rotulo="Validade" name="validade" type="date" />
        </div>
        <Campo rotulo="URL do arquivo" name="url" type="url" placeholder="https://…" required />
        <p className="eyebrow">Vincular a (opcional)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect rotulo="Cliente" name="clienteId" opcoes={paraOpcoes(opcoes.clientes)} incluirVazio="Nenhum" />
          <CampoSelect
            rotulo="Proprietário"
            name="proprietarioId"
            opcoes={paraOpcoes(opcoes.proprietarios)}
            incluirVazio="Nenhum"
          />
          <CampoSelect rotulo="Imóvel" name="imovelId" opcoes={paraOpcoes(opcoes.imoveis)} incluirVazio="Nenhum" />
          <CampoSelect
            rotulo="Contrato"
            name="contratoId"
            opcoes={paraOpcoes(opcoes.contratos)}
            incluirVazio="Nenhum"
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
      <p className="mt-3 text-xs text-ink-faint">
        <Link href="/imob/contratos" className="hover:underline">
          Documentos de contrato
        </Link>{" "}
        também podem ser anexados na própria página do contrato.
      </p>
    </Modal>
  );
}
