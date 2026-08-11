"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { processarBuscaDoNavegador, type ResultadoBuscaManual } from "@/lib/publicacoes/acoes";
import { buscarPublicacoesNoNavegador } from "@/lib/publicacoes/buscar-no-navegador";

// Janela de segurança: reprocessa os últimos dias mesmo que já tenha sido
// buscado antes — idempotente pelo hashConteudo, então reprocessar não
// duplica nada. Mesmo valor usado na rotina automática (Fase 5).
const JANELA_DE_SEGURANCA_DIAS = 4;

// O cron da Vercel roda no servidor e o DJEN bloqueia essa infraestrutura de
// nuvem (ver buscar-no-navegador.ts) — na prática, a ingestão automática só
// funciona mesmo saindo do navegador de alguém. Pra não depender de alguém
// lembrar de clicar todo dia, esta busca dispara sozinha ao abrir o painel,
// no máximo uma vez a cada janela abaixo (throttle local, por navegador).
const INTERVALO_AUTO_HORAS = 6;

function formatarDataIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function chaveUltimaBusca(oab: string, uf: string): string {
  return `gitghc-ultima-busca-djen:${oab}:${uf}`;
}

export function BotaoBuscarAgora({ oab, uf }: { oab: string; uf: string }) {
  const [resultado, setResultado] = useState<ResultadoBuscaManual | null>(null);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [automatica, setAutomatica] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const jaTentouAuto = useRef(false);

  function buscar(ehAutomatica: boolean) {
    setResultado(null);
    setErroBusca(null);
    setAutomatica(ehAutomatica);
    try {
      window.localStorage.setItem(chaveUltimaBusca(oab, uf), new Date().toISOString());
    } catch {
      // localStorage indisponível (modo privado restrito, etc.) — sem throttle, tudo bem.
    }
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: `buscar` de propósito fora da lista — é recriada a cada render, e o guard `jaTentouAuto` já garante que isto roda uma vez só por montagem.
  useEffect(() => {
    if (jaTentouAuto.current) return;
    jaTentouAuto.current = true;
    let ultima: string | null = null;
    try {
      ultima = window.localStorage.getItem(chaveUltimaBusca(oab, uf));
    } catch {
      // segue sem throttle
    }
    const horasDesdeUltima = ultima ? (Date.now() - new Date(ultima).getTime()) / (60 * 60 * 1000) : Infinity;
    if (horasDesdeUltima >= INTERVALO_AUTO_HORAS) {
      buscar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oab, uf]);

  return (
    <div className="paper-card rounded-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Ingestão</p>
          <p className="text-sm text-ink-soft">
            Busca publicações novas do DJEN pela OAB do escritório (últimos {JANELA_DE_SEGURANCA_DIAS} dias). Roda
            sozinha ao abrir o painel (no máximo a cada {INTERVALO_AUTO_HORAS}h); o botão força uma busca na hora.
          </p>
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={() => buscar(false)}
          className="flex shrink-0 items-center gap-2 rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente && (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 animate-spin" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
              <path d="M18 10a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
          {pendente ? (automatica ? "Verificando…" : "Buscando…") : "Buscar publicações agora"}
        </button>
      </div>

      {erroBusca && <p className="mt-3 text-sm text-urgent">{erroBusca}</p>}

      {resultado && (
        <div className="mt-3 text-sm">
          {resultado.sucesso ? (
            <p className="text-calm">
              {resultado.encontradas} encontrada(s) · {resultado.novas} nova(s) · {resultado.vinculadas} vinculada(s) ·{" "}
              {resultado.naoIdentificadas} não identificada(s) · {resultado.prazosCriados} prazo(s) criado(s)
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
