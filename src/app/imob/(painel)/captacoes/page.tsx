import { redirect } from "next/navigation";
import { CaptacoesClient } from "@/components/imob/CaptacoesClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarImoveisParaSelecao, listarProprietariosParaSelecao } from "@/lib/imob/consultas";
import { listarCaptacoes, listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

function iso(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function CaptacoesPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "captacoes.ver")) {
    redirect("/imob");
  }
  const [captacoes, proprietarios, imoveis, corretores] = await Promise.all([
    listarCaptacoes(sessao.imobiliariaId),
    listarProprietariosParaSelecao(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Prospecção</p>
        <h1 className="font-display text-3xl">Captação de imóveis</h1>
      </header>
      <CaptacoesClient
        podeCriar={temPermissao(sessao.papel.permissoes, "captacoes.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "captacoes.editar")}
        captacoes={captacoes.map((c) => ({
          id: c.id,
          status: c.status,
          origem: c.origem,
          exclusividade: c.exclusividade,
          comissaoPercentual: c.comissaoPercentual,
          dataCaptacao: iso(c.dataCaptacao),
          validadeExclusividade: iso(c.validadeExclusividade),
          observacoes: c.observacoes,
          proprietarioId: c.proprietarioId,
          imovelId: c.imovelId,
          corretorId: c.corretorId,
          imovelCodigo: c.imovelCodigo,
          proprietarioNome: c.proprietarioNome,
          corretorNome: c.corretor?.nome ?? null,
        }))}
        opcoes={{
          proprietarios: proprietarios.map((p) => ({ id: p.id, nome: p.nome })),
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}
