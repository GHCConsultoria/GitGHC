import { redirect } from "next/navigation";
import { obterSessaoImob } from "@/lib/imob/auth";
import { temPermissao } from "@/lib/imob/rbac";
import { RELATORIOS } from "@/lib/imob/relatorios";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "relatorios.ver")) {
    redirect("/imob");
  }
  const podeExportar = temPermissao(sessao.papel.permissoes, "relatorios.exportar");
  const disponiveis = RELATORIOS.filter((r) => temPermissao(sessao.papel.permissoes, r.permissao));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Análise</p>
        <h1 className="font-display text-3xl">Relatórios</h1>
        <p className="mt-1 text-sm text-ink-soft">Exporte os dados da sua imobiliária em CSV (abre no Excel).</p>
      </header>

      {disponiveis.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">
          Você não tem acesso a nenhum relatório.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disponiveis.map((r) => (
            <div key={r.tipo} className="paper-card flex flex-col gap-3 rounded-md p-5">
              <h2 className="font-display text-lg">{r.nome}</h2>
              {podeExportar ? (
                <a
                  href={`/imob/relatorios-csv?tipo=${r.tipo}`}
                  className="mt-auto inline-block rounded-sm bg-brass px-4 py-2 text-center text-sm font-medium text-brass-on hover:bg-brass-deep"
                >
                  Exportar CSV
                </a>
              ) : (
                <span className="mt-auto text-xs text-ink-faint">Sem permissão para exportar.</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
