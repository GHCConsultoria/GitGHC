"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ItemDashboardPrazo, BucketDashboard } from "@/lib/prazos/dashboard";
import { formatarDataCalendario } from "@/lib/formatacao";
import type { UsuarioSelecionavel } from "./PainelTarefas";

const TITULO_BUCKET: Record<BucketDashboard, string> = {
  HOJE: "Vencendo hoje",
  PROXIMOS_3_DIAS: "Próximos 3 dias",
  PROXIMOS_7_DIAS: "Próximos 7 dias",
};

const COR_BUCKET: Record<BucketDashboard, string> = {
  HOJE: "border-l-urgent-line",
  PROXIMOS_3_DIAS: "border-l-attention-line",
  PROXIMOS_7_DIAS: "border-l-calm-line",
};

const PONTO_BUCKET: Record<BucketDashboard, string> = {
  HOJE: "bg-urgent",
  PROXIMOS_3_DIAS: "bg-attention",
  PROXIMOS_7_DIAS: "bg-calm",
};

const ORDEM_BUCKETS: BucketDashboard[] = ["HOJE", "PROXIMOS_3_DIAS", "PROXIMOS_7_DIAS"];

/** Dashboard de controle de prazos: agrupa por urgência (hoje/3d/7d), com contador regressivo e filtro por responsável. */
export function PainelDashboard({
  itens,
  usuarios,
  riscoPrazoIds,
}: {
  itens: ItemDashboardPrazo[];
  usuarios: UsuarioSelecionavel[];
  riscoPrazoIds: string[];
}) {
  const [filtroResponsavelId, setFiltroResponsavelId] = useState("");
  const riscoIds = useMemo(() => new Set(riscoPrazoIds), [riscoPrazoIds]);

  const itensFiltrados = useMemo(() => {
    if (!filtroResponsavelId) return itens;
    return itens.filter((item) => item.prazo.responsavelId === filtroResponsavelId);
  }, [itens, filtroResponsavelId]);

  const porBucket = useMemo(() => {
    const grupos: Record<BucketDashboard, ItemDashboardPrazo[]> = { HOJE: [], PROXIMOS_3_DIAS: [], PROXIMOS_7_DIAS: [] };
    for (const item of itensFiltrados) grupos[item.bucket].push(item);
    return grupos;
  }, [itensFiltrados]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-2">
        <label className="text-xs text-ink-soft" htmlFor="filtro-responsavel">
          Responsável
        </label>
        <select
          id="filtro-responsavel"
          value={filtroResponsavelId}
          onChange={(evento) => setFiltroResponsavelId(evento.target.value)}
          className="rounded-sm border border-rule bg-paper-raised px-2.5 py-1.5 text-sm outline-none focus:border-brass"
        >
          <option value="">Todos</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {ORDEM_BUCKETS.map((bucket) => (
          <div key={bucket}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${PONTO_BUCKET[bucket]}`} />
              <h3 className="text-sm font-medium text-ink">{TITULO_BUCKET[bucket]}</h3>
              <span className="font-data text-xs text-ink-faint">
                {String(porBucket[bucket].length).padStart(2, "0")}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {porBucket[bucket].length === 0 && (
                <li className="paper-card rounded-sm px-3 py-4 text-center text-xs text-ink-faint">Nada aqui.</li>
              )}
              {porBucket[bucket].map((item, indice) => (
                <li key={item.prazo.id} className="stagger-in" style={{ "--stagger-index": indice } as React.CSSProperties}>
                  <CartaoDashboard item={item} emRisco={riscoIds.has(item.prazo.id)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartaoDashboard({ item, emRisco }: { item: ItemDashboardPrazo; emRisco: boolean }) {
  const { prazo, bucket, diasCorridosRestantes, vencido } = item;

  return (
    <Link
      href={`/publicacoes/${prazo.publicacaoId}`}
      className={`paper-card paper-card-interactive block rounded-sm border-l-[3px] p-3.5 ${COR_BUCKET[bucket]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-ink">{prazo.processo.cliente}</p>
        {emRisco && (
          <span
            title="Este prazo também está sinalizado no painel de Riscos"
            className="shrink-0 rounded-full border border-ink-faint/40 px-1.5 py-0.5 text-[0.65rem] leading-none text-ink-faint"
          >
            ⚫ risco
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate font-data text-xs text-ink-faint">{prazo.processo.numeroCnj}</p>
      <p className="mt-1.5 text-xs text-ink-soft">{prazo.tipoAto}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-rule pt-2.5">
        <span className="font-data text-xs text-ink">{formatarDataCalendario(prazo.dataFatal)}</span>
        {vencido ? (
          <span className="font-data text-xs font-medium text-urgent">vencido</span>
        ) : bucket === "HOJE" ? (
          <ContadorRegressivo dataFatal={prazo.dataFatal} />
        ) : (
          <span className="font-data text-xs text-ink-faint">
            {diasCorridosRestantes}d
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={prazo.status === "CONFIRMADO" ? "text-calm" : "text-attention"}>
          {prazo.status === "CONFIRMADO" ? "Confirmado" : "Pendente de confirmação"}
        </span>
        {prazo.responsavel && <span className="truncate text-ink-faint">{prazo.responsavel.nome}</span>}
      </div>
    </Link>
  );
}

// Brasil suspendeu horário de verão nacionalmente desde 2019 — America/Sao_Paulo
// é UTC-3 fixo. Simplificação aceitável aqui porque isto é só o contador
// regressivo visual (HH:MM:SS até o fim do dia); o cálculo do prazo em si usa
// Intl.DateTimeFormat com fuso horário real (ver src/lib/prazos/calculo.ts).
const OFFSET_SAO_PAULO_MINUTOS = 3 * 60;

function fimDoDiaEmSaoPaulo(dataFatal: Date): number {
  return (
    Date.UTC(dataFatal.getUTCFullYear(), dataFatal.getUTCMonth(), dataFatal.getUTCDate(), 23, 59, 59, 999) +
    OFFSET_SAO_PAULO_MINUTOS * 60 * 1000
  );
}

function ContadorRegressivo({ dataFatal }: { dataFatal: Date }) {
  const alvo = useMemo(() => fimDoDiaEmSaoPaulo(dataFatal), [dataFatal]);
  const [restanteMs, setRestanteMs] = useState(() => alvo - Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setRestanteMs(alvo - Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [alvo]);

  if (restanteMs <= 0) {
    return <span className="font-data text-xs font-medium text-urgent">vencido</span>;
  }

  const horas = Math.floor(restanteMs / (60 * 60 * 1000));
  const minutos = Math.floor((restanteMs % (60 * 60 * 1000)) / (60 * 1000));
  const segundos = Math.floor((restanteMs % (60 * 1000)) / 1000);

  return (
    <span className="font-data text-xs font-medium tabular-nums text-urgent">
      {String(horas).padStart(2, "0")}:{String(minutos).padStart(2, "0")}:{String(segundos).padStart(2, "0")}
    </span>
  );
}
