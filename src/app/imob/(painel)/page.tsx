import Link from "next/link";
import { obterSessaoImob } from "@/lib/imob/auth";
import { resumoComercial } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";
import { ROTULO_TIPO_IMOVEL, rotulo } from "@/lib/imob/rotulos";

export const dynamic = "force-dynamic";

/**
 * Painel inicial. Fase 2: KPIs comerciais reais (imóveis por status, clientes,
 * proprietários) + distribuição por tipo. Vendas/locações/comissões entram
 * quando esses módulos existirem — nada de número inventado.
 */
export default async function PainelImob() {
  const sessao = await obterSessaoImob();
  const r = await resumoComercial(sessao.imobiliariaId);
  const maxTipo = Math.max(1, ...r.porTipo.map((t) => t.total));
  const podeVerImoveis = temPermissao(sessao.papel.permissoes, "imoveis.ver");

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Painel</p>
        <h1 className="font-display text-3xl">Olá, {sessao.nome.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-soft">{sessao.imobiliaria.nome}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao rotulo="Imóveis ativos" valor={r.imoveis} href={podeVerImoveis ? "/imob/imoveis" : undefined} />
        <Cartao rotulo="Disponíveis" valor={r.disponiveis} />
        <Cartao rotulo="Em negociação" valor={r.negociacao} />
        <Cartao rotulo="Vendidos / alugados" valor={r.vendidos + r.alugados} />
        <Cartao rotulo="Clientes" valor={r.clientes} />
        <Cartao rotulo="Proprietários" valor={r.proprietarios} />
      </section>

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-4">Imóveis por tipo</p>
        {r.porTipo.length === 0 ? (
          <p className="text-sm text-ink-soft">Cadastre imóveis para ver a distribuição.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {r.porTipo.map((t) => (
              <li key={t.tipo} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-ink-soft">{rotulo(ROTULO_TIPO_IMOVEL, t.tipo)}</span>
                <span
                  className="h-2 rounded-full bg-brass"
                  style={{ width: `${(t.total / maxTipo) * 100}%`, minWidth: "0.5rem" }}
                />
                <span className="text-ink-soft">{t.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Cartao({ rotulo: r, valor, href }: { rotulo: string; valor: number; href?: string }) {
  const conteudo = (
    <>
      <p className="eyebrow">{r}</p>
      <p className="font-display mt-2 text-3xl">{valor}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="paper-card rounded-md p-5 transition-colors hover:border-brass">
        {conteudo}
      </Link>
    );
  }
  return <div className="paper-card rounded-md p-5">{conteudo}</div>;
}
