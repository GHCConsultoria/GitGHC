import Link from "next/link";
import { obterSessaoImob } from "@/lib/imob/auth";
import { buscarGlobal } from "@/lib/imob/busca";

export const dynamic = "force-dynamic";

export default async function BuscaPage({ searchParams }: { searchParams: { q?: string } }) {
  const sessao = await obterSessaoImob();
  const termo = (searchParams.q ?? "").trim();
  const grupos = termo.length >= 2 ? await buscarGlobal(sessao.imobiliariaId, termo, sessao.papel.permissoes) : [];
  const total = grupos.reduce((s, g) => s + g.itens.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Busca global</p>
        <h1 className="font-display text-3xl">Busca</h1>
      </header>

      <form method="get" className="paper-card flex gap-2 rounded-md p-4">
        <input
          type="search"
          name="q"
          defaultValue={termo}
          placeholder="Nome, código, documento, telefone, e-mail…"
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
        />
        <button
          type="submit"
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
        >
          Buscar
        </button>
      </form>

      {termo.length < 2 ? (
        <p className="text-sm text-ink-soft">Digite ao menos 2 caracteres.</p>
      ) : total === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">
          Nada encontrado para “{termo}”.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((g) => (
            <section key={g.categoria}>
              <p className="eyebrow mb-2">{g.categoria}</p>
              <ul className="paper-card divide-y divide-rule/60 rounded-md">
                {g.itens.map((item) => (
                  <li key={item.href + item.titulo}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-paper-raised"
                    >
                      <span className="font-medium">{item.titulo}</span>
                      {item.subtitulo && <span className="text-ink-soft">{item.subtitulo}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
