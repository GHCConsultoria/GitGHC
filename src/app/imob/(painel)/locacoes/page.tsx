import { redirect } from "next/navigation";
import { LocacoesClient } from "@/components/imob/LocacoesClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import {
  listarClientesParaSelecao,
  listarImoveisParaSelecao,
  listarProprietariosParaSelecao,
} from "@/lib/imob/consultas";
import { listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { listarLocacoes } from "@/lib/imob/consultas-fin";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

function iso(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function LocacoesPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "locacoes.ver")) {
    redirect("/imob");
  }
  const [locacoes, imoveis, clientes, proprietarios, corretores] = await Promise.all([
    listarLocacoes(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarProprietariosParaSelecao(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Contratos de aluguel</p>
        <h1 className="font-display text-3xl">Locações</h1>
      </header>
      <LocacoesClient
        podeCriar={temPermissao(sessao.papel.permissoes, "locacoes.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "locacoes.editar")}
        locacoes={locacoes.map((l) => ({
          id: l.id,
          imovelId: l.imovelId,
          proprietarioId: l.proprietarioId,
          locatarioId: l.locatarioId,
          corretorId: l.corretorId,
          fiadorNome: l.fiadorNome,
          valorAluguel: l.valorAluguel,
          condominio: l.condominio,
          iptu: l.iptu,
          seguro: l.seguro,
          caucao: l.caucao,
          dataInicial: iso(l.dataInicial) ?? "",
          dataFinal: iso(l.dataFinal),
          diaVencimento: l.diaVencimento,
          indiceReajuste: l.indiceReajuste,
          status: l.status,
          imovelCodigo: l.imovelCodigo,
          locatarioNome: l.locatarioNome,
          proprietarioNome: l.proprietarioNome,
        }))}
        opcoes={{
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          proprietarios: proprietarios.map((p) => ({ id: p.id, nome: p.nome })),
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}
