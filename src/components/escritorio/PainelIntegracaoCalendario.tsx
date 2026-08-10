"use client";

import { useState, useTransition } from "react";
import { regenerarTokenFeedCalendario } from "@/lib/calendario/acoes";

export function PainelIntegracaoCalendario({ urlFeedInicial }: { urlFeedInicial: string }) {
  const [urlFeed, setUrlFeed] = useState(urlFeedInicial);
  const [copiado, setCopiado] = useState(false);
  const [confirmandoRegeneracao, setConfirmandoRegeneracao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  // webcal:// é o esquema que Apple Calendar e Outlook reconhecem nativamente
  // pra assinar direto, num clique só, em vez de baixar o arquivo uma vez.
  // O truque do "cid" é o jeito documentado do próprio Google de abrir o
  // Google Calendar já pronto pra assinar uma URL externa.
  const urlWebcal = urlFeed.replace(/^https?:\/\//, "webcal://");
  const urlGoogleCalendar = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(urlWebcal)}`;

  async function copiar() {
    await navigator.clipboard.writeText(urlFeed);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function regenerar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await regenerarTokenFeedCalendario();
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setUrlFeed((atual) => atual.replace(/\/api\/calendario\/[^/]+\//, `/api/calendario/${resultado.token}/`));
      setConfirmandoRegeneracao(false);
    });
  }

  return (
    <div className="paper-card rounded-sm p-6">
      <p className="mb-3 text-sm text-ink-soft">
        Link privado com os prazos <strong className="text-ink">confirmados</strong> deste escritório, no formato que
        Google Calendar, Outlook e Apple Calendar entendem. Depois de adicionado, cada serviço busca as atualizações
        sozinho. O intervalo (geralmente algumas horas) é decidido por eles, não é instantâneo.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={urlGoogleCalendar}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep"
        >
          Adicionar ao Google Calendar
        </a>
        <a
          href={urlWebcal}
          className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-rule px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brass"
        >
          Adicionar no Apple Calendar / Outlook
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          readOnly
          value={urlFeed}
          onFocus={(evento) => evento.target.select()}
          className="min-w-0 flex-1 rounded-sm border border-rule bg-paper-raised px-3 py-2 font-data text-xs text-ink-soft outline-none focus:border-brass"
        />
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 rounded-sm border border-rule px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-brass hover:text-ink"
        >
          {copiado ? "Copiado!" : "Copiar link manualmente"}
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Os botões acima já abrem o app de calendário pronto pra assinar. Use o link manual só se algum deles não
        funcionar no seu navegador.
      </p>

      <div className="mt-5 border-t border-rule pt-4">
        {!confirmandoRegeneracao ? (
          <button
            type="button"
            onClick={() => setConfirmandoRegeneracao(true)}
            className="text-xs text-ink-faint underline decoration-dotted underline-offset-2 hover:text-urgent"
          >
            Gerar novo link (revoga o atual)
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-urgent">
              Quem já assinou o link atual para de receber atualizações assim que um novo for gerado. Confirma?
            </p>
            <button
              type="button"
              disabled={pendente}
              onClick={regenerar}
              className="rounded-sm bg-urgent px-3 py-1.5 text-xs font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pendente ? "Gerando…" : "Sim, gerar novo link"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoRegeneracao(false)}
              className="text-xs text-ink-faint hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        )}
        {erro && <p className="mt-2 text-xs text-urgent">{erro}</p>}
      </div>
    </div>
  );
}
