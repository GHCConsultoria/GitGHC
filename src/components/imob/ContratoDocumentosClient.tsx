"use client";

import { useState, useTransition } from "react";
import { Campo, CLASSE_BOTAO_PRIMARIO, Mensagem } from "@/components/imob/primitivos";
import { adicionarDocumentoContrato, removerDocumentoContrato } from "@/lib/imob/acoes-fin";
import { formatarData } from "@/lib/imob/formato";

interface Documento {
  id: string;
  nome: string;
  url: string;
  criadoEm: string;
}

export function ContratoDocumentosClient({
  contratoId,
  documentos,
  podeEditar,
}: {
  contratoId: string;
  documentos: Documento[];
  podeEditar: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function adicionar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("contratoId", contratoId);
    start(async () => {
      const r = await adicionarDocumentoContrato(fd);
      if (r.sucesso) form.reset();
      else setErro(r.erro);
    });
  }

  function remover(documentoId: string) {
    if (!confirm("Remover este documento?")) return;
    const fd = new FormData();
    fd.set("contratoId", contratoId);
    fd.set("documentoId", documentoId);
    start(async () => {
      const r = await removerDocumentoContrato(fd);
      if (!r.sucesso) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {documentos.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum documento anexado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documentos.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-rule p-3 text-sm"
            >
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                {d.nome}
              </a>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-faint">{formatarData(d.criadoEm)}</span>
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => remover(d.id)}
                    disabled={pending}
                    className="text-ink-soft hover:text-urgent hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <form onSubmit={adicionar} className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <Campo rotulo="Nome do documento" name="nome" />
          </div>
          <div className="flex-1">
            <Campo rotulo="URL" name="url" type="url" placeholder="https://…" />
          </div>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "…" : "Anexar"}
          </button>
        </form>
      )}
      <Mensagem erro={erro} />
    </div>
  );
}
