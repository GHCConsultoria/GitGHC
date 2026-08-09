"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ItemNav {
  href: string;
  rotulo: string;
}

const CLASSE_LINK_DESKTOP =
  "border-b border-transparent pb-0.5 text-ink-soft transition-colors hover:border-brass hover:text-ink";

/**
 * Nav do painel principal: em telas largas continua a lista horizontal de
 * sempre; abaixo do breakpoint sm ela viraria uma sopa de links quebrando
 * linha (o que já aconteceu — 8 itens não cabem numa tela de celular). Ali
 * vira um botão de menu (☰) que abre um painel com os mesmos links
 * empilhados. Client component só por causa do estado aberto/fechado — os
 * links em si continuam <Link> normais, navegação real, não SPA fake.
 */
export function NavPrincipal({ itens, acaoSair }: { itens: ItemNav[]; acaoSair: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-x-5 px-6 py-3 text-sm sm:px-10">
        <span className="eyebrow shrink-0 text-ink">GitGHC</span>

        <div className="hidden flex-1 flex-wrap items-center gap-x-5 gap-y-2 sm:flex">
          {itens.map((item) => (
            <Link key={item.href} href={item.href} className={CLASSE_LINK_DESKTOP}>
              {item.rotulo}
            </Link>
          ))}
          <form action={acaoSair} className="ml-auto">
            <button type="submit" className={CLASSE_LINK_DESKTOP}>
              Sair
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setAberto((valor) => !valor)}
          aria-expanded={aberto}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:text-ink sm:hidden"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
            {aberto ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div className={`expand sm:hidden ${aberto ? "is-open" : ""}`}>
        <div>
          <div className="flex flex-col gap-1 border-t border-rule px-6 py-3">
            {itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`rounded-sm px-2 py-2 text-sm transition-colors ${
                  pathname === item.href ? "text-brass" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.rotulo}
              </Link>
            ))}
            <form action={acaoSair}>
              <button
                type="submit"
                className="w-full rounded-sm px-2 py-2 text-left text-sm text-ink-soft transition-colors hover:text-ink"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
