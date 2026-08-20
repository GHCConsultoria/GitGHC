import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarImoveis } from "@/lib/imob/consultas";
import { centavosParaReais } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";
import { ROTULO_FINALIDADE, ROTULO_STATUS_IMOVEL, ROTULO_TIPO_IMOVEL, rotulo } from "@/lib/imob/rotulos";
import { listagemImoveisSchema, STATUS_IMOVEL, TIPOS_IMOVEL } from "@/lib/imob/schemas";

export const dynamic = "force-dynamic";

const CORES_STATUS: Record<string, string> = {
  DISPONIVEL: "bg-brass/15 text-brass-deep",
  RESERVADO: "bg-amber-100 text-amber-800",
  EM_NEGOCIACAO: "bg-amber-100 text-amber-800",
  VENDIDO: "bg-paper text-ink-soft",
  ALUGADO: "bg-paper text-ink-soft",
  INATIVO: "bg-urgent-bg text-urgent",
};

interface SP {
  pagina?: string;
  busca?: string;
  status?: string;
  tipo?: string;
  finalidade?: string;
}

export default async function ImoveisPage({ searchParams }: { searchParams: SP }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "imoveis.ver")) {
    redirect("/imob");
  }

  const filtros = listagemImoveisSchema.parse({
    pagina: searchParams.pagina,
    busca: searchParams.busca,
    status: searchParams.status ?? "",
    tipo: searchParams.tipo ?? "",
    finalidade: searchParams.finalidade ?? "",
  });
  const { itens, total, pagina, totalPaginas } = await listarImoveis(sessao.imobiliariaId, filtros);
  const podeCriar = temPermissao(sessao.papel.permissoes, "imoveis.criar");

  function linkPagina(p: number) {
    const params = new URLSearchParams();
    if (filtros.busca) params.set("busca", filtros.busca);
    if (filtros.status) params.set("status", filtros.status);
    if (filtros.tipo) params.set("tipo", filtros.tipo);
    if (filtros.finalidade) params.set("finalidade", filtros.finalidade);
    params.set("pagina", String(p));
    return `/imob/imoveis?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Portfólio</p>
          <h1 className="font-display text-3xl">Imóveis</h1>
          <p className="mt-1 text-sm text-ink-soft">{total} imóvel(is)</p>
        </div>
        {podeCriar && (
          <Link
            href="/imob/imoveis/novo"
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
          >
            + Novo imóvel
          </Link>
        )}
      </header>

      {/* Filtros por GET */}
      <form method="get" className="paper-card flex flex-wrap items-end gap-3 rounded-md p-4">
        <label className="text-sm">
          <span className="eyebrow mb-1 block">Buscar</span>
          <input
            type="search"
            name="busca"
            defaultValue={filtros.busca}
            placeholder="Código, título, bairro…"
            className="w-56 rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
          />
        </label>
        <FiltroSelect
          nome="status"
          rotulo="Status"
          valores={STATUS_IMOVEL}
          mapa={ROTULO_STATUS_IMOVEL}
          atual={filtros.status}
        />
        <FiltroSelect nome="tipo" rotulo="Tipo" valores={TIPOS_IMOVEL} mapa={ROTULO_TIPO_IMOVEL} atual={filtros.tipo} />
        <button type="submit" className="rounded-sm border border-rule px-4 py-2 text-sm hover:bg-paper-raised">
          Aplicar
        </button>
        {(filtros.busca || filtros.status || filtros.tipo || filtros.finalidade) && (
          <Link href="/imob/imoveis" className="px-2 py-2 text-sm text-ink-soft hover:underline">
            Limpar
          </Link>
        )}
      </form>

      {itens.length === 0 ? (
        <div className="paper-card flex flex-col items-center gap-3 rounded-md p-12 text-center">
          <p className="text-sm text-ink-soft">Nenhum imóvel encontrado.</p>
          {podeCriar && (
            <Link
              href="/imob/imoveis/novo"
              className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
            >
              + Cadastrar imóvel
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((im) => {
            const foto = im.fotos[0];
            const preco =
              im.finalidade === "LOCACAO"
                ? centavosParaReais(im.precoAluguel)
                : centavosParaReais(im.precoVenda) || centavosParaReais(im.precoAluguel);
            return (
              <Link key={im.id} href={`/imob/imoveis/${im.id}`} className="paper-card overflow-hidden rounded-md">
                <div className="flex aspect-video items-center justify-center bg-paper">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto.url} alt={im.titulo} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-ink-faint">Sem foto</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow">{im.codigo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${CORES_STATUS[im.status] ?? ""}`}>
                      {rotulo(ROTULO_STATUS_IMOVEL, im.status)}
                    </span>
                  </div>
                  <h2 className="mt-1 line-clamp-1 font-medium">{im.titulo}</h2>
                  <p className="text-xs text-ink-soft">
                    {rotulo(ROTULO_TIPO_IMOVEL, im.tipo)} · {rotulo(ROTULO_FINALIDADE, im.finalidade)}
                    {im.cidade ? ` · ${im.cidade}` : ""}
                  </p>
                  <p className="mt-2 font-display text-lg">{preco || "Sob consulta"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {pagina > 1 && (
            <Link
              href={linkPagina(pagina - 1)}
              className="rounded-sm border border-rule px-3 py-1.5 hover:bg-paper-raised"
            >
              Anterior
            </Link>
          )}
          <span className="text-ink-soft">
            Página {pagina} de {totalPaginas}
          </span>
          {pagina < totalPaginas && (
            <Link
              href={linkPagina(pagina + 1)}
              className="rounded-sm border border-rule px-3 py-1.5 hover:bg-paper-raised"
            >
              Próxima
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function FiltroSelect({
  nome,
  rotulo: label,
  valores,
  mapa,
  atual,
}: {
  nome: string;
  rotulo: string;
  valores: readonly string[];
  mapa: Record<string, string>;
  atual?: string;
}) {
  return (
    <label className="text-sm">
      <span className="eyebrow mb-1 block">{label}</span>
      <select
        name={nome}
        defaultValue={atual ?? ""}
        className="rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
      >
        <option value="">Todos</option>
        {valores.map((v) => (
          <option key={v} value={v}>
            {mapa[v] ?? v}
          </option>
        ))}
      </select>
    </label>
  );
}
