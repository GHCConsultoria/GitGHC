"use client";

import { useState, useTransition } from "react";
import type { Publicacao } from "@prisma/client";
import { vincularPublicacaoAProcesso } from "@/lib/prazos/acoes";

interface ProcessoResumo {
  id: string;
  numeroCnj: string;
  cliente: string;
  varaOrgao: string;
}

function formatarData(data: Date | string): string {
  const instante = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(instante);
}

export function PainelNaoIdentificadas({
  publicacoes,
  processos,
}: {
  publicacoes: Publicacao[];
  processos: ProcessoResumo[];
}) {
  if (publicacoes.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">Nenhuma publicação pendente de vínculo.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {publicacoes.map((publicacao) => (
        <li key={publicacao.id}>
          <ItemNaoIdentificada publicacao={publicacao} processos={processos} />
        </li>
      ))}
    </ul>
  );
}

function ItemNaoIdentificada({
  publicacao,
  processos,
}: {
  publicacao: Publicacao;
  processos: ProcessoResumo[];
}) {
  const [processoId, setProcessoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function vincular() {
    if (!processoId) {
      setErro("selecione um processo");
      return;
    }
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await vincularPublicacaoAProcesso({ publicacaoId: publicacao.id, processoId });
      if (!resultado.sucesso) setErro(resultado.erro);
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-black/50 dark:text-white/50">
        {publicacao.fonte} · disponibilizada em {formatarData(publicacao.dataDisponibilizacao)}
      </p>
      <p className="mt-1 line-clamp-2 text-sm">{publicacao.conteudo}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={processoId}
          onChange={(evento) => setProcessoId(evento.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">Selecione o processo…</option>
          {processos.map((processo) => (
            <option key={processo.id} value={processo.id}>
              {processo.cliente} — {processo.numeroCnj} ({processo.varaOrgao})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pendente}
          onClick={vincular}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Vincular
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
