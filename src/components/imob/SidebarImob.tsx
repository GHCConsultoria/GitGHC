"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ItemNav } from "@/lib/imob/navegacao";

interface Props {
  itens: ItemNav[];
  usuario: { nome: string; papel: string; imobiliaria: string };
  acaoSair: () => Promise<void>;
}

/**
 * Sidebar fixa no desktop, menu deslizante no mobile. Recebe os itens já
 * filtrados por permissão do servidor — não decide autorização aqui.
 */
export function SidebarImob({ itens, usuario, acaoSair }: Props) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  function ehAtivo(href: string) {
    return href === "/imob" ? pathname === "/imob" : pathname.startsWith(href);
  }

  return (
    <>
      {/* Topbar mobile */}
      <header className="flex items-center justify-between border-b border-rule bg-paper px-4 py-3 lg:hidden">
        <span className="font-display text-lg">{usuario.imobiliaria}</span>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="rounded-sm border border-rule px-3 py-1.5 text-sm"
          aria-expanded={aberto}
        >
          Menu
        </button>
      </header>

      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-rule bg-paper-raised transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-rule px-5 py-4">
          <p className="eyebrow">Imobiliária</p>
          <p className="font-display text-lg leading-tight">{usuario.imobiliaria}</p>
        </div>

        <form action="/imob/busca" method="get" className="border-b border-rule px-3 py-2">
          <input
            type="search"
            name="q"
            placeholder="Buscar…"
            aria-label="Busca global"
            className="w-full rounded-sm border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-brass"
          />
        </form>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-0.5">
            {itens.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setAberto(false)}
                  className={`block rounded-sm px-3 py-2 text-sm transition-colors ${
                    ehAtivo(item.href) ? "bg-brass text-brass-on" : "text-ink-soft hover:bg-paper hover:text-ink"
                  }`}
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-rule px-5 py-4">
          <p className="truncate text-sm font-medium">{usuario.nome}</p>
          <p className="eyebrow mb-3">{usuario.papel}</p>
          <form action={acaoSair}>
            <button
              type="submit"
              className="text-sm text-ink-soft underline-offset-2 hover:text-urgent hover:underline"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
