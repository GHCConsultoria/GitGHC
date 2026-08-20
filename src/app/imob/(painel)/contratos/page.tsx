import { redirect } from "next/navigation";
import { ContratosClient, type ContratoView } from "@/components/imob/ContratosClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import {
  listarClientesParaSelecao,
  listarImoveisParaSelecao,
  listarProprietariosParaSelecao,
} from "@/lib/imob/consultas";
import { contratosVencendo, listarContratos } from "@/lib/imob/consultas-fin";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

function iso(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function ContratosPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "contratos.ver")) {
    redirect("/imob");
  }
  const [contratos, vencendo, imoveis, clientes, proprietarios] = await Promise.all([
    listarContratos(sessao.imobiliariaId),
    contratosVencendo(sessao.imobiliariaId, 30),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarProprietariosParaSelecao(sessao.imobiliariaId),
  ]);

  const mapear = (c: (typeof contratos)[number]): ContratoView => ({
    id: c.id,
    titulo: c.titulo,
    tipo: c.tipo,
    status: c.status,
    imovelId: c.imovelId,
    clienteId: c.clienteId,
    proprietarioId: c.proprietarioId,
    dataInicio: iso(c.dataInicio),
    dataFim: iso(c.dataFim),
    observacoes: c.observacoes,
    documentos: c._count.documentos,
    faixa: c.alerta?.faixa ?? null,
    diasRestantes: c.alerta?.diasRestantes ?? null,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Documentos</p>
        <h1 className="font-display text-3xl">Contratos</h1>
      </header>
      <ContratosClient
        podeCriar={temPermissao(sessao.papel.permissoes, "contratos.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "contratos.editar")}
        contratos={contratos.map(mapear)}
        vencendo={vencendo.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          tipo: c.tipo,
          status: c.status,
          imovelId: c.imovelId,
          clienteId: c.clienteId,
          proprietarioId: c.proprietarioId,
          dataInicio: iso(c.dataInicio),
          dataFim: iso(c.dataFim),
          observacoes: c.observacoes,
          documentos: 0,
          faixa: c.alerta.faixa,
          diasRestantes: c.alerta.diasRestantes,
        }))}
        opcoes={{
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          proprietarios: proprietarios.map((p) => ({ id: p.id, nome: p.nome })),
        }}
      />
    </div>
  );
}
