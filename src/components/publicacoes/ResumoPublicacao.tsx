"use client";

import { useEffect, useState } from "react";
import { gerarResumoPublicacao } from "@/lib/ia/acoes";

/**
 * Resumo em 3 linhas gerado por IA, no lugar do texto bruto — gera sozinho
 * ao montar (sem precisar clicar em nada), cacheado depois da primeira vez.
 * Se a IA não estiver configurada ou falhar, cai de volta pro texto
 * original truncado, sem exibir erro (isto é só um atalho de leitura, não
 * uma ação que o usuário pediu).
 */
export function ResumoPublicacao({
  publicacaoId,
  resumoInicial,
  textoOriginal,
}: {
  publicacaoId: string;
  resumoInicial: string | null;
  textoOriginal: string;
}) {
  const [resumo, setResumo] = useState(resumoInicial);
  const [carregando, setCarregando] = useState(!resumoInicial);
  const [mostrarOriginal, setMostrarOriginal] = useState(false);

  useEffect(() => {
    if (resumoInicial) return;
    let cancelado = false;
    gerarResumoPublicacao({ publicacaoId }).then((resultado) => {
      if (cancelado) return;
      if (resultado.sucesso) setResumo(resultado.resumo);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [publicacaoId, resumoInicial]);

  const linhas = resumo
    ? resumo
        .split("\n")
        .map((linha) => linha.trim())
        .filter(Boolean)
    : [];

  const usarOriginal = mostrarOriginal || (!resumo && !carregando);

  return (
    <div>
      {usarOriginal ? (
        <p className="line-clamp-3 text-[0.9rem] italic leading-relaxed text-ink-soft">&ldquo;{textoOriginal}&rdquo;</p>
      ) : carregando ? (
        <p className="text-sm text-ink-faint">Gerando resumo…</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {linhas.map((linha, indice) => (
            <p key={indice} className="text-sm text-ink-soft">
              {linha}
            </p>
          ))}
        </div>
      )}
      {resumo && (
        <button
          type="button"
          onClick={() => setMostrarOriginal((valor) => !valor)}
          className="mt-1.5 text-xs text-ink-faint underline decoration-dotted transition-colors hover:text-brass"
        >
          {mostrarOriginal ? "ver resumo" : "ver texto original"}
        </button>
      )}
    </div>
  );
}
