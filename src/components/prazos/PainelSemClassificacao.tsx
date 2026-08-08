"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { obterSugestaoTipoAtoPublicacao, classificarPublicacaoComTipoAto } from "@/lib/ia/acoes";
import type { PublicacaoVinculadaSemPrazo } from "@/lib/prazos/fila";
import { formatarDataCalendario } from "@/lib/formatacao";
import { ResumoPublicacao } from "@/components/publicacoes/ResumoPublicacao";

export interface TipoAtoOpcao {
  tipoAto: string;
  descricao: string | null;
}

export function PainelSemClassificacao({
  publicacoes,
  tiposDisponiveis,
}: {
  publicacoes: PublicacaoVinculadaSemPrazo[];
  tiposDisponiveis: TipoAtoOpcao[];
}) {
  if (publicacoes.length === 0) {
    return (
      <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
        Nenhuma publicação vinculada sem tipo de ato identificado.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {publicacoes.map((publicacao, indice) => (
        <li key={publicacao.id} className="stagger-in" style={{ "--stagger-index": indice } as React.CSSProperties}>
          <CartaoSemClassificacao publicacao={publicacao} tiposDisponiveis={tiposDisponiveis} />
        </li>
      ))}
    </ul>
  );
}

function CartaoSemClassificacao({
  publicacao,
  tiposDisponiveis,
}: {
  publicacao: PublicacaoVinculadaSemPrazo;
  tiposDisponiveis: TipoAtoOpcao[];
}) {
  const [sugestao, setSugestao] = useState<{ tipoAtoSugerido: string | null; justificativa: string } | null>(null);
  const [tipoAtoEscolhido, setTipoAtoEscolhido] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendenteSugestao, iniciarTransicaoSugestao] = useTransition();
  const [pendenteAplicar, iniciarTransicaoAplicar] = useTransition();

  function pedirSugestao() {
    setErro(null);
    iniciarTransicaoSugestao(async () => {
      const resultado = await obterSugestaoTipoAtoPublicacao({ publicacaoId: publicacao.id });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSugestao(resultado);
      if (resultado.tipoAtoSugerido) setTipoAtoEscolhido(resultado.tipoAtoSugerido);
    });
  }

  function aplicar() {
    if (!tipoAtoEscolhido) {
      setErro("escolha um tipo de ato antes de calcular");
      return;
    }
    setErro(null);
    iniciarTransicaoAplicar(async () => {
      const resultado = await classificarPublicacaoComTipoAto({
        publicacaoId: publicacao.id,
        tipoAto: tipoAtoEscolhido,
      });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
    });
  }

  if (sucesso) {
    return (
      <article className="paper-card rounded-sm border-l-[3px] border-l-calm-line p-5 text-sm text-calm">
        Prazo calculado e enviado para confirmação.
      </article>
    );
  }

  return (
    <article className="paper-card rounded-sm border-l-[3px] border-l-attention-line p-5">
      <p className="eyebrow">
        {publicacao.processo?.cliente} · {publicacao.processo?.numeroCnj}
      </p>
      <p className="mt-1 font-data text-xs text-ink-faint">
        Disponibilização: {formatarDataCalendario(publicacao.dataDisponibilizacao)}
      </p>
      <Link
        href={`/publicacoes/${publicacao.id}`}
        className="mt-1 inline-block text-xs text-ink-faint underline decoration-dotted transition-colors hover:text-brass"
      >
        Ver central da publicação
      </Link>
      <blockquote className="mt-3 border-l-2 border-rule py-1 pl-4">
        <ResumoPublicacao
          publicacaoId={publicacao.id}
          resumoInicial={publicacao.resumoIa}
          textoOriginal={publicacao.conteudo}
        />
      </blockquote>

      {!sugestao && (
        <button
          type="button"
          disabled={pendenteSugestao}
          onClick={pedirSugestao}
          className="mt-4 rounded-sm bg-brass px-4 py-1.5 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendenteSugestao ? "Consultando IA…" : "Sugerir tipo de ato com IA"}
        </button>
      )}

      {sugestao && (
        <div className="mt-4 rounded-sm border border-rule bg-paper p-3.5">
          <p className="text-sm">
            {sugestao.tipoAtoSugerido ? (
              <>
                Sugestão: <span className="font-medium text-ink">{sugestao.tipoAtoSugerido}</span>
              </>
            ) : (
              <span className="text-ink-soft">Sem sugestão segura — classifique manualmente.</span>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-faint">{sugestao.justificativa}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={tipoAtoEscolhido}
              onChange={(evento) => setTipoAtoEscolhido(evento.target.value)}
              className="rounded-sm border border-rule bg-paper-raised px-2.5 py-1.5 text-sm outline-none focus:border-brass"
            >
              <option value="">Escolha o tipo de ato</option>
              {tiposDisponiveis.map((tipo) => (
                <option key={tipo.tipoAto} value={tipo.tipoAto}>
                  {tipo.tipoAto}
                  {tipo.descricao ? ` — ${tipo.descricao}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pendenteAplicar || !tipoAtoEscolhido}
              onClick={aplicar}
              className="rounded-sm bg-ink px-4 py-1.5 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pendenteAplicar ? "Calculando…" : "Calcular prazo"}
            </button>
          </div>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-urgent">{erro}</p>}
    </article>
  );
}
