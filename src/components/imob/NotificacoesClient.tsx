"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CLASSE_BOTAO_NEUTRO } from "@/components/imob/primitivos";
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from "@/lib/imob/acoes-conteudo";
import { formatarData } from "@/lib/imob/formato";
import { ROTULO_TIPO_NOTIFICACAO } from "@/lib/imob/rotulos";

export interface NotificacaoView {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

export function NotificacoesClient({ notificacoes }: { notificacoes: NotificacaoView[] }) {
  const [pending, start] = useTransition();
  const temNaoLidas = notificacoes.some((n) => !n.lida);

  function marcar(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await marcarNotificacaoLida(fd);
    });
  }

  function marcarTodas() {
    start(async () => {
      await marcarTodasNotificacoesLidas();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {temNaoLidas && (
        <div className="flex justify-end">
          <button type="button" onClick={marcarTodas} disabled={pending} className={CLASSE_BOTAO_NEUTRO}>
            Marcar todas como lidas
          </button>
        </div>
      )}

      {notificacoes.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhuma notificação.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notificacoes.map((n) => (
            <li
              key={n.id}
              className={`paper-card flex items-start justify-between gap-3 rounded-md p-4 ${n.lida ? "opacity-60" : ""}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!n.lida && <span className="h-2 w-2 rounded-full bg-brass" />}
                  <span className="eyebrow">{ROTULO_TIPO_NOTIFICACAO[n.tipo] ?? n.tipo}</span>
                  <span className="text-xs text-ink-faint">{formatarData(n.criadoEm)}</span>
                </div>
                <p className="mt-1 font-medium">{n.titulo}</p>
                <p className="text-sm text-ink-soft">{n.mensagem}</p>
                {n.link && (
                  <Link href={n.link} className="mt-1 inline-block text-sm text-brass-deep hover:underline">
                    Abrir →
                  </Link>
                )}
              </div>
              {!n.lida && (
                <button
                  type="button"
                  onClick={() => marcar(n.id)}
                  disabled={pending}
                  className="text-sm text-ink-soft hover:text-ink hover:underline disabled:opacity-50"
                >
                  Marcar lida
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
