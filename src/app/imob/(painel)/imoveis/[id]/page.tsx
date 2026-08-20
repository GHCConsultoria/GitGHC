import Link from "next/link";
import { notFound } from "next/navigation";
import { FotosImovelClient } from "@/components/imob/FotosImovelClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { obterImovelDoTenant } from "@/lib/imob/consultas";
import { centavosParaReais } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";
import { ROTULO_FINALIDADE, ROTULO_STATUS_IMOVEL, ROTULO_TIPO_IMOVEL, rotulo } from "@/lib/imob/rotulos";

export const dynamic = "force-dynamic";

export default async function ImovelDetalhePage({ params }: { params: { id: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "imoveis.ver")) {
    notFound();
  }
  const imovel = await obterImovelDoTenant(sessao.imobiliariaId, params.id);
  if (!imovel) notFound();

  const podeEditar = temPermissao(sessao.papel.permissoes, "imoveis.editar");
  const endereco = [imovel.logradouro, imovel.numero, imovel.bairro, imovel.cidade, imovel.estado]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/imob/imoveis" className="text-sm text-ink-soft hover:underline">
            ← Imóveis
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <span className="eyebrow">{imovel.codigo}</span>
            <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
              {rotulo(ROTULO_STATUS_IMOVEL, imovel.status)}
            </span>
          </div>
          <h1 className="font-display text-3xl">{imovel.titulo}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {rotulo(ROTULO_TIPO_IMOVEL, imovel.tipo)} · {rotulo(ROTULO_FINALIDADE, imovel.finalidade)}
          </p>
        </div>
        {podeEditar && (
          <Link
            href={`/imob/imoveis/${imovel.id}/editar`}
            className="rounded-sm border border-rule px-4 py-2 text-sm hover:bg-paper-raised"
          >
            Editar
          </Link>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info rotulo="Venda" valor={centavosParaReais(imovel.precoVenda) || "—"} />
        <Info rotulo="Aluguel" valor={centavosParaReais(imovel.precoAluguel) || "—"} />
        <Info rotulo="Condomínio" valor={centavosParaReais(imovel.condominio) || "—"} />
        <Info rotulo="IPTU" valor={centavosParaReais(imovel.iptu) || "—"} />
      </section>

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-3">Características</p>
        <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Dado rotulo="Área total" valor={imovel.areaTotal ? `${imovel.areaTotal} m²` : "—"} />
          <Dado rotulo="Área construída" valor={imovel.areaConstruida ? `${imovel.areaConstruida} m²` : "—"} />
          <Dado rotulo="Quartos" valor={imovel.quartos ?? "—"} />
          <Dado rotulo="Suítes" valor={imovel.suites ?? "—"} />
          <Dado rotulo="Banheiros" valor={imovel.banheiros ?? "—"} />
          <Dado rotulo="Vagas" valor={imovel.vagas ?? "—"} />
          <Dado rotulo="Andar" valor={imovel.andar ?? "—"} />
          <Dado rotulo="Ano" valor={imovel.anoConstrucao ?? "—"} />
          <Dado rotulo="Financiamento" valor={imovel.aceitaFinanciamento ? "Sim" : "Não"} />
          <Dado rotulo="Permuta" valor={imovel.aceitaPermuta ? "Sim" : "Não"} />
          <Dado rotulo="Mobiliado" valor={imovel.mobiliado ? "Sim" : "Não"} />
        </div>
        {imovel.caracteristicas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {imovel.caracteristicas.map((c) => (
              <span key={c} className="rounded-full bg-paper px-2.5 py-1 text-xs text-ink-soft">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {imovel.descricao && (
        <section className="paper-card rounded-md p-6">
          <p className="eyebrow mb-2">Descrição</p>
          <p className="whitespace-pre-wrap text-sm text-ink-soft">{imovel.descricao}</p>
        </section>
      )}

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-2">Localização</p>
        <p className="text-sm text-ink-soft">{endereco || "Endereço não informado"}</p>
      </section>

      {imovel.proprietarios.length > 0 && (
        <section className="paper-card rounded-md p-6">
          <p className="eyebrow mb-2">Proprietários</p>
          <ul className="text-sm">
            {imovel.proprietarios.map((vp) => (
              <li key={vp.proprietario.id}>{vp.proprietario.nome}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-3">Fotos</p>
        <FotosImovelClient
          imovelId={imovel.id}
          podeEditar={podeEditar}
          fotos={imovel.fotos.map((f) => ({ id: f.id, url: f.url, legenda: f.legenda, principal: f.principal }))}
        />
      </section>
    </div>
  );
}

function Info({ rotulo: r, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="paper-card rounded-md p-4">
      <p className="eyebrow">{r}</p>
      <p className="font-display mt-1 text-lg">{valor}</p>
    </div>
  );
}

function Dado({ rotulo: r, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{r}</p>
      <p>{valor}</p>
    </div>
  );
}
