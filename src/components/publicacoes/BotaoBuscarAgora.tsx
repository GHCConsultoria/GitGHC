"use client";

import { useState, useTransition } from "react";
import { buscarPublicacoesNoNavegador } from "@/lib/publicacoes/buscar-no-navegador";
import { processarBuscaDoNavegador, type ResultadoBuscaManual } from "@/lib/publicacoes/acoes";

// Janela de segurança: reprocessa os últimos dias mesmo que já tenha sido
// buscado antes — idempotente pelo hashConteudo, então reprocessar não
// duplica nada. Mesmo valor usado na rotina automática (Fase 5).
const JANELA_DE_SEGURANCA_DIAS = 4;

function formatarDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function BotaoBuscarAgora({ oab, uf }: { oab: string; uf: string }) {
  const [resultado, setResultado] = useState<ResultadoBuscaManual | null>(null);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function buscar() {
    setResultado(null);
    setErroBusca(null);
    iniciarTransicao(async () => {
      try {
        const hoje = new Date();
        const inicio = new Date(hoje.getTime());
        inicio.setDate(inicio.getDate() - JANELA_DE_SEGURANCA_DIAS);

        // Passo 1: busca no DJEN acontece aqui, no navegador — é o que
        // evita o bloqueio de rede que a Vercel sofre.
        const brutas = await buscarPublicacoesNoNavegador({
          oab,
          uf,
          dataInicio: formatarDataIso(inicio),
          dataFim: formatarDataIso(hoje),
        });

        // Passo 2: o resto (persistir, vincular, calcular prazo, alertar) roda no servidor.
        const resposta = await processarBuscaDoNavegador(brutas);
        setResultado(resposta);
      } catch (erro) {
        setErroBusca(erro instanceof Error ? erro.message : "erro desconhecido ao buscar no DJEN");
      }
    });
  }

  return (
    <div className="paper-card rounded-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Ingestão manual</p>
          <p className="text-sm text-ink-soft">
            Busca publicações novas do DJEN pela OAB do escritório (últimos {JANELA_DE_SEGURANCA_DIAS} dias).
          </p>
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={buscar}
          className="shrink-0 rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Buscando…" : "Buscar publicações agora"}
        </button>
      </div>

      {erroBusca && <p className="mt-3 text-sm text-urgent">{erroBusca}</p>}

      {resultado && (
        <div className="mt-3 text-sm">
          {resultado.sucesso ? (
            <p className="text-calm">
              {resultado.encontradas} encontrada(s) · {resultado.novas} nova(s) · {resultado.vinculadas} vinculada(s)
              · {resultado.naoIdentificadas} não identificada(s) · {resultado.prazosCriados} prazo(s) criado(s)
              {resultado.prazosParaRevisaoManual > 0 && ` · ${resultado.prazosParaRevisaoManual} para revisão manual`}
            </p>
          ) : (
            <p className="text-urgent">{resultado.erro}</p>
          )}
        </div>
      )}
    </div>
  );
}
