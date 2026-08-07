"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Publicacao } from "@prisma/client";
import { vincularPublicacaoAProcesso } from "@/lib/prazos/acoes";
import { formatarDataCalendario } from "@/lib/formatacao";
import { extrairCandidatosDeProcesso } from "@/lib/publicacoes/extrair-candidatos";
import { formatarNumeroCnjParaExibicao } from "@/lib/publicacoes/cnj";
import { FormularioNovoProcesso } from "@/components/processos/FormularioNovoProcesso";

interface ProcessoResumo {
  id: string;
  numeroCnj: string;
  cliente: string;
  varaOrgao: string;
}

export function PainelNaoIdentificadas({
  publicacoes,
  processos,
}: {
  publicacoes: Publicacao[];
  processos: ProcessoResumo[];
}) {
  if (publicacoes.length === 0) {
    return (
      <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
        Nenhuma publicação pendente de vínculo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {publicacoes.map((publicacao, indice) => (
        <li key={publicacao.id} className="stagger-in" style={{ "--stagger-index": indice } as React.CSSProperties}>
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
  const [mostrarCadastro, setMostrarCadastro] = useState(false);

  const candidatos = useMemo(() => extrairCandidatosDeProcesso(publicacao.conteudo), [publicacao.conteudo]);
  const temSugestao = Boolean(candidatos.numeroCnj || candidatos.uf || candidatos.clienteSugerido);

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
    <div className="paper-card rounded-sm border-l-[3px] border-l-rule p-5">
      <p className="eyebrow">
        {publicacao.fonte} · {formatarDataCalendario(publicacao.dataDisponibilizacao)}
      </p>
      <p className="mt-2 line-clamp-2 text-sm italic text-ink-soft">&ldquo;{publicacao.conteudo}&rdquo;</p>
      <Link
        href={`/publicacoes/${publicacao.id}`}
        className="mt-1 inline-block text-xs text-ink-faint underline decoration-dotted transition-colors hover:text-brass"
      >
        Ver central da publicação
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <select
          value={processoId}
          onChange={(evento) => setProcessoId(evento.target.value)}
          className="rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-brass"
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
          className="rounded-sm bg-ink px-4 py-1.5 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Vincular
        </button>
        <span className="text-xs text-ink-faint">ou</span>
        <button
          type="button"
          onClick={() => setMostrarCadastro((valor) => !valor)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-brass"
        >
          <svg
            viewBox="0 0 10 10"
            className={`h-2.5 w-2.5 transition-transform duration-300 ${mostrarCadastro ? "rotate-180" : ""}`}
            fill="none"
          >
            <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Cadastrar processo novo{temSugestao ? " (sugestões preenchidas)" : ""}
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-urgent">{erro}</p>}

      <div className={`expand ${mostrarCadastro ? "is-open" : ""}`}>
        <div>
          <div className="mt-4 border-t border-rule pt-4">
            {temSugestao && (
              <p className="mb-3 text-xs text-ink-faint">
                Campos abaixo foram sugeridos a partir do texto da publicação — confira antes de salvar.
              </p>
            )}
            <FormularioNovoProcesso
              publicacaoId={publicacao.id}
              valoresIniciais={{
                numeroCnj: candidatos.numeroCnj ? formatarNumeroCnjParaExibicao(candidatos.numeroCnj) : "",
                cliente: candidatos.clienteSugerido ?? "",
                uf: candidatos.uf ?? "SP",
                tribunal: candidatos.tribunal ?? "",
              }}
              aoCadastrar={() => setMostrarCadastro(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
