import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ImovelForm } from "@/components/imob/ImovelForm";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarProprietariosParaSelecao, obterImovelDoTenant } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function EditarImovelPage({ params }: { params: { id: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "imoveis.editar")) {
    redirect("/imob/imoveis");
  }
  const [imovel, proprietarios] = await Promise.all([
    obterImovelDoTenant(sessao.imobiliariaId, params.id),
    listarProprietariosParaSelecao(sessao.imobiliariaId),
  ]);
  if (!imovel) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href={`/imob/imoveis/${imovel.id}`} className="text-sm text-ink-soft hover:underline">
          ← {imovel.codigo}
        </Link>
        <h1 className="font-display mt-1 text-3xl">Editar imóvel</h1>
      </header>
      <ImovelForm
        modo="editar"
        proprietarios={proprietarios}
        valores={{
          id: imovel.id,
          codigo: imovel.codigo,
          titulo: imovel.titulo,
          descricao: imovel.descricao,
          tipo: imovel.tipo,
          finalidade: imovel.finalidade,
          status: imovel.status,
          precoVenda: imovel.precoVenda,
          precoAluguel: imovel.precoAluguel,
          condominio: imovel.condominio,
          iptu: imovel.iptu,
          areaTotal: imovel.areaTotal,
          areaConstruida: imovel.areaConstruida,
          quartos: imovel.quartos,
          suites: imovel.suites,
          banheiros: imovel.banheiros,
          vagas: imovel.vagas,
          andar: imovel.andar,
          anoConstrucao: imovel.anoConstrucao,
          aceitaFinanciamento: imovel.aceitaFinanciamento,
          aceitaPermuta: imovel.aceitaPermuta,
          mobiliado: imovel.mobiliado,
          caracteristicas: imovel.caracteristicas,
          cep: imovel.cep,
          logradouro: imovel.logradouro,
          numero: imovel.numero,
          complemento: imovel.complemento,
          bairro: imovel.bairro,
          cidade: imovel.cidade,
          estado: imovel.estado,
          tourVirtualUrl: imovel.tourVirtualUrl,
          proprietarioIds: imovel.proprietarios.map((vp) => vp.proprietario.id),
        }}
      />
    </div>
  );
}
