"use client";

import { useEffect, useRef, useState } from "react";
import { buscarPerguntas, PERGUNTAS_AJUDA, type PerguntaAjuda } from "@/lib/ajuda/perguntas";

type Mensagem =
  | { autor: "bot"; texto: string; sugestoes?: PerguntaAjuda[] }
  | { autor: "usuario"; texto: string };

const MENSAGEM_INICIAL: Mensagem = {
  autor: "bot",
  texto: "Oi! Sou a central de dúvidas do GitGHC, sem IA: só respostas prontas sobre como usar o sistema. Escolha uma pergunta ou digite o que procura.",
  sugestoes: PERGUNTAS_AJUDA.slice(0, 5),
};

/**
 * Widget de ajuda flutuante: aparência de chat, mas é busca por
 * palavra-chave numa base fixa (ver src/lib/ajuda/perguntas.ts) — sem
 * chamada de IA, sem custo por mensagem, sem depender de rede. Fica
 * disponível em todo o painel autenticado (ver (painel)/layout.tsx).
 */
export function ChatAjuda() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_INICIAL]);
  const [consulta, setConsulta] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto]);

  function perguntar(item: PerguntaAjuda) {
    setMensagens((atual) => [
      ...atual,
      { autor: "usuario", texto: item.pergunta },
      {
        autor: "bot",
        texto: item.resposta,
        sugestoes: PERGUNTAS_AJUDA.filter((p) => p.categoria === item.categoria && p.id !== item.id).slice(0, 3),
      },
    ]);
  }

  function buscar(evento: React.FormEvent) {
    evento.preventDefault();
    const texto = consulta.trim();
    if (!texto) return;
    setConsulta("");

    const resultados = buscarPerguntas(texto);
    if (resultados.length === 0) {
      setMensagens((atual) => [
        ...atual,
        { autor: "usuario", texto },
        {
          autor: "bot",
          texto:
            "Não achei nada pronto sobre isso na base de ajuda. Tenta outras palavras, ou fala direto com o suporte do escritório.",
        },
      ]);
      return;
    }

    if (resultados.length === 1) {
      perguntar(resultados[0]);
      return;
    }

    setMensagens((atual) => [
      ...atual,
      { autor: "usuario", texto },
      { autor: "bot", texto: "Achei estas perguntas parecidas:", sugestoes: resultados.slice(0, 5) },
    ]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label={aberto ? "Fechar central de ajuda" : "Abrir central de ajuda"}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brass text-brass-on shadow-lg transition-transform hover:scale-105"
      >
        {aberto ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
            <path
              d="M3 9.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5-3.1 6.5-7 6.5c-.9 0-1.8-.15-2.6-.44L4 17l1.1-3.2C3.8 12.6 3 11.1 3 9.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {aberto && (
        <div className="fixed bottom-20 right-4 z-40 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-rule bg-paper-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Central de ajuda</p>
              <p className="text-xs text-ink-faint">Respostas prontas, sem IA</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {mensagens.map((mensagem, indice) => (
              <div key={indice}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    mensagem.autor === "bot"
                      ? "bg-paper text-ink"
                      : "ml-auto bg-brass text-brass-on"
                  }`}
                >
                  {mensagem.texto}
                </div>
                {mensagem.autor === "bot" && mensagem.sugestoes && mensagem.sugestoes.length > 0 && (
                  <div className="mt-2 flex flex-col items-start gap-1.5">
                    {mensagem.sugestoes.map((sugestao) => (
                      <button
                        key={sugestao.id}
                        type="button"
                        onClick={() => perguntar(sugestao)}
                        className="rounded-full border border-brass/40 px-3 py-1 text-left text-xs text-brass transition-colors hover:bg-brass/10"
                      >
                        {sugestao.pergunta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          <form onSubmit={buscar} className="flex gap-2 border-t border-rule p-3">
            <input
              type="text"
              value={consulta}
              onChange={(evento) => setConsulta(evento.target.value)}
              placeholder="Digite sua dúvida…"
              className="flex-1 rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-brass"
            />
            <button
              type="submit"
              className="rounded-sm bg-brass px-3 py-1.5 text-sm font-medium text-brass-on transition-colors hover:bg-brass-deep"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
