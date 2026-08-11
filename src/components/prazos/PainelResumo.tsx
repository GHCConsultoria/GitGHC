import type { SVGProps } from "react";

const IconeRelogio = (p: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <circle cx="10" cy="10" r="7" stroke="currentColor" />
    <path d="M10 6v4l2.5 1.5" stroke="currentColor" />
  </svg>
);
const IconeAguardando = (p: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <path d="M5 3h10M5 17h10M6 3c0 4 8 4 8 8.5-8 4.5-8 4.5-8 8.5" stroke="currentColor" />
  </svg>
);
const IconeCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <circle cx="10" cy="10" r="7" stroke="currentColor" />
    <path d="M7 10.2l2 2 4-4.4" stroke="currentColor" />
  </svg>
);
const IconeAlerta = (p: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...p}
  >
    <path d="M10 3 17.5 16h-15L10 3Z" stroke="currentColor" />
    <path d="M10 8v3.5" stroke="currentColor" />
    <circle cx="10" cy="13.6" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

interface CartaoResumo {
  rotulo: string;
  valor: number;
  Icone: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  acento: string;
  corIcone: string;
}

/** Linha de indicadores rápidos no topo do dashboard — "como está o escritório agora" num relance, antes de descer pros painéis detalhados. */
export function PainelResumo({
  vencendoHoje,
  aguardandoConfirmacao,
  confirmados,
  emRisco,
}: {
  vencendoHoje: number;
  aguardandoConfirmacao: number;
  confirmados: number;
  emRisco: number;
}) {
  const cartoes: CartaoResumo[] = [
    {
      rotulo: "Vencendo hoje",
      valor: vencendoHoje,
      Icone: IconeRelogio,
      acento: "border-l-urgent-line",
      corIcone: "bg-urgent-bg text-urgent",
    },
    {
      rotulo: "Aguardando confirmação",
      valor: aguardandoConfirmacao,
      Icone: IconeAguardando,
      acento: "border-l-attention-line",
      corIcone: "bg-attention-bg text-attention",
    },
    {
      rotulo: "Confirmados",
      valor: confirmados,
      Icone: IconeCheck,
      acento: "border-l-calm-line",
      corIcone: "bg-calm-bg text-calm",
    },
    {
      rotulo: "Em risco",
      valor: emRisco,
      Icone: IconeAlerta,
      acento: "border-l-ink-faint",
      corIcone: "bg-paper text-ink-soft",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cartoes.map((cartao) => (
        <div
          key={cartao.rotulo}
          className={`paper-card flex items-start justify-between rounded-sm border-l-4 p-4 ${cartao.acento}`}
        >
          <div className="min-w-0">
            <p className="eyebrow mb-1.5 truncate">{cartao.rotulo}</p>
            <p className="font-display text-2xl font-semibold tabular-nums text-ink">{cartao.valor}</p>
          </div>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cartao.corIcone}`}>
            <cartao.Icone className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
