import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao } from "@/lib/imob/consultas";
import { imoveisCompativeis } from "@/lib/imob/consultas-crm";
import { centavosParaReais } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";
import { ROTULO_FINALIDADE, ROTULO_TIPO_IMOVEL, rotulo } from "@/lib/imob/rotulos";

export const dynamic = "force-dynamic";

export default async function MatchingPage({ searchParams }: { searchParams: { clienteId?: string } }) {
  const sessao = await obterSessaoImob();
  // matching é leitura de clientes + imóveis
  if (!temPermissao(sessao.papel.permissoes, "clientes.ver") || !temPermissao(sessao.papel.permissoes, "imoveis.ver")) {
    redirect("/imob");
  }

  const clientes = await listarClientesParaSelecao(sessao.imobiliariaId);
  const resultado = searchParams.clienteId
    ? await imoveisCompativeis(sessao.imobiliariaId, searchParams.clienteId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Inteligência comercial</p>
        <h1 className="font-display text-3xl">Compatibilidade cliente × imóvel</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Selecione um cliente para ver os imóveis do portfólio ordenados por compatibilidade com o perfil de busca.
        </p>
      </header>

      <form method="get" className="paper-card flex flex-wrap items-end gap-3 rounded-md p-4">
        <label className="text-sm">
          <span className="eyebrow mb-1 block">Cliente</span>
          <select
            name="clienteId"
            defaultValue={searchParams.clienteId ?? ""}
            className="w-64 rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
          >
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
        >
          Buscar compatíveis
        </button>
      </form>

      {resultado === null && !searchParams.clienteId && (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Escolha um cliente acima.</div>
      )}

      {resultado && !resultado.cliente.temPreferencias && (
        <div className="paper-card rounded-md p-6 text-sm text-ink-soft">
          <strong>{resultado.cliente.nome}</strong> ainda não tem preferências de busca cadastradas. Edite o cliente e
          preencha as preferências (tipo, faixa de valor, cidade, quartos…) para o matching funcionar.
        </div>
      )}

      {resultado?.cliente.temPreferencias && (
        <>
          <p className="text-sm text-ink-soft">
            <strong>{resultado.compativeis.length}</strong> imóvel(is) compatível(is) para {resultado.cliente.nome} —{" "}
            <strong>{resultado.acima80}</strong> com mais de 80%.
          </p>
          {resultado.compativeis.length === 0 ? (
            <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">
              Nenhum imóvel do portfólio atende às preferências deste cliente.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {resultado.compativeis.map((im) => (
                <li key={im.id} className="paper-card flex items-center gap-4 rounded-md p-4">
                  <div className="w-14 shrink-0 text-center">
                    <p className="font-display text-2xl">{im.score}%</p>
                  </div>
                  <div className="flex-1">
                    <Link href={`/imob/imoveis/${im.id}`} className="font-medium hover:underline">
                      {im.codigo} — {im.titulo}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {rotulo(ROTULO_TIPO_IMOVEL, im.tipo)} · {rotulo(ROTULO_FINALIDADE, im.finalidade)}
                      {im.cidade ? ` · ${im.cidade}` : ""}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full max-w-xs rounded-full bg-paper">
                      <div className="h-full rounded-full bg-brass" style={{ width: `${im.score}%` }} />
                    </div>
                  </div>
                  <div className="hidden text-right text-sm text-ink-soft sm:block">
                    {centavosParaReais(im.precoVenda) || centavosParaReais(im.precoAluguel) || "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
