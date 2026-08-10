"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";

function Icone({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

const IconeGrade = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <rect x="3" y="3" width="6" height="6" rx="1.3" stroke="currentColor" />
    <rect x="11" y="3" width="6" height="6" rx="1.3" stroke="currentColor" />
    <rect x="3" y="11" width="6" height="6" rx="1.3" stroke="currentColor" />
    <rect x="11" y="11" width="6" height="6" rx="1.3" stroke="currentColor" />
  </Icone>
);
const IconePasta = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h3l1.5 2h7A1.5 1.5 0 0 1 17.5 7.5v8A1.5 1.5 0 0 1 16 17H4.5A1.5 1.5 0 0 1 3 15.5v-10Z" stroke="currentColor" />
  </Icone>
);
const IconeDocumento = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M5.5 3h6l3 3v10.5a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-12.5a1 1 0 0 1 1-1Z" stroke="currentColor" />
    <path d="M7.5 10.5h5M7.5 13.5h5" stroke="currentColor" />
  </Icone>
);
const IconeCalendarioX = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" />
    <path d="M3 8h14M7 2.5v3M13 2.5v3M8 11.5l4 4M12 11.5l-4 4" stroke="currentColor" />
  </Icone>
);
const IconeCalendario = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" />
    <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" />
  </Icone>
);
const IconePessoas = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <circle cx="7" cy="7" r="2.3" stroke="currentColor" />
    <path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" />
    <circle cx="14.5" cy="6.5" r="1.8" stroke="currentColor" />
    <path d="M12.5 9.3c2 0 4 1.3 4.5 3.3" stroke="currentColor" />
  </Icone>
);
const IconeEscudo = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M10 2.5 16 4.5v4.5c0 4-2.5 6.9-6 8-3.5-1.1-6-4-6-8V4.5L10 2.5Z" stroke="currentColor" />
    <path d="M7.3 9.7l1.8 1.8 3.5-3.5" stroke="currentColor" />
  </Icone>
);
const IconePredio = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <rect x="4" y="3" width="8" height="14" rx="1" stroke="currentColor" />
    <path d="M12 8h4v9h-4M6.5 6.5h1M9.5 6.5h1M6.5 9.5h1M9.5 9.5h1M6.5 12.5h1M9.5 12.5h1" stroke="currentColor" />
  </Icone>
);
const IconePulso = (p: SVGProps<SVGSVGElement>) => (
  <Icone {...p}>
    <path d="M2.5 10.5h3l1.5-4 3 8 1.5-4h6" stroke="currentColor" />
  </Icone>
);

export interface ItemNavSidebar {
  href: string;
  rotulo: string;
  icone: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
}

export interface GrupoNavSidebar {
  titulo: string;
  itens: ItemNavSidebar[];
}

export const GRUPOS_NAV_PAINEL: GrupoNavSidebar[] = [
  { titulo: "Painel", itens: [{ href: "/", rotulo: "Dashboard", icone: IconeGrade }] },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/processos", rotulo: "Processos", icone: IconePasta },
      { href: "/modelos", rotulo: "Modelos", icone: IconeDocumento },
      { href: "/feriados", rotulo: "Feriados", icone: IconeCalendarioX },
      { href: "/usuarios", rotulo: "Usuários", icone: IconePessoas },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/agenda", rotulo: "Agenda", icone: IconeCalendario },
      { href: "/relatorios/seguranca", rotulo: "Relatório", icone: IconeEscudo },
      { href: "/escritorio", rotulo: "Escritório", icone: IconePredio },
      { href: "/saude", rotulo: "Painel de saúde", icone: IconePulso },
    ],
  },
];

function ehAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brass text-brass-on">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
          <path
            d="M4 10.5 8 14l8-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">GitGHC</p>
        <p className="truncate text-xs text-ink-faint">Conferência de prazos</p>
      </div>
    </div>
  );
}

function ListaNav({ onNavegar }: { onNavegar?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
      {GRUPOS_NAV_PAINEL.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="eyebrow mb-1.5 px-2">{grupo.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const ativo = ehAtivo(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavegar}
                    className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors ${
                      ativo
                        ? "bg-brass text-brass-on font-medium"
                        : "text-ink-soft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    <item.icone className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.rotulo}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Navegação principal do painel autenticado: sidebar fixa em telas largas
 * (>= lg), igual ao layout de referência. Abaixo disso vira uma barra fina
 * no topo (logo + hambúrguer) que abre a mesma lista como um painel
 * deslizante por cima do conteúdo — client component só por causa do estado
 * do painel mobile, os links continuam <Link> de verdade.
 */
export function SidebarPrincipal({
  usuario,
  acaoSair,
}: {
  usuario: { nome: string; role: string };
  acaoSair: () => Promise<void>;
}) {
  const [abertoMobile, setAbertoMobile] = useState(false);

  return (
    <>
      {/* Barra mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper-raised/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brass text-brass-on">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M4 10.5 8 14l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink">GitGHC</span>
        </div>
        <button
          type="button"
          onClick={() => setAbertoMobile(true)}
          aria-label="Abrir menu"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Painel deslizante mobile */}
      {abertoMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setAbertoMobile(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-rule bg-paper-raised">
            <div className="flex items-center justify-between">
              <Marca />
              <button
                type="button"
                onClick={() => setAbertoMobile(false)}
                aria-label="Fechar menu"
                className="mr-4 flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft hover:text-ink"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <ListaNav onNavegar={() => setAbertoMobile(false)} />
            <RodapeSidebar usuario={usuario} acaoSair={acaoSair} />
          </div>
        </div>
      )}

      {/* Sidebar fixa desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-rule bg-paper-raised lg:flex">
        <Marca />
        <ListaNav />
        <RodapeSidebar usuario={usuario} acaoSair={acaoSair} />
      </aside>
    </>
  );
}

function RodapeSidebar({
  usuario,
  acaoSair,
}: {
  usuario: { nome: string; role: string };
  acaoSair: () => Promise<void>;
}) {
  return (
    <div className="border-t border-rule px-3 py-3">
      <div className="flex items-center gap-2.5 rounded-sm px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-medium text-ink-soft">
          {usuario.nome.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{usuario.nome}</p>
          <p className="truncate text-xs text-ink-faint">{usuario.role === "ADVOGADO" ? "Advogado" : "Assistente"}</p>
        </div>
      </div>
      <form action={acaoSair}>
        <button
          type="submit"
          className="mt-1 w-full rounded-sm px-2.5 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
