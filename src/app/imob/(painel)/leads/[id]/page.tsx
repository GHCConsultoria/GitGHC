import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadDetalheClient } from "@/components/imob/LeadDetalheClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao, listarImoveisParaSelecao } from "@/lib/imob/consultas";
import { listarCorretoresParaSelecao, obterLeadDoTenant } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function LeadDetalhePage({ params }: { params: { id: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "leads.ver")) {
    notFound();
  }
  const lead = await obterLeadDoTenant(sessao.imobiliariaId, params.id);
  if (!lead) notFound();

  const [corretores, imoveis, clientes] = await Promise.all([
    listarCorretoresParaSelecao(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/imob/leads" className="text-sm text-ink-soft hover:underline">
        ← Leads
      </Link>
      <LeadDetalheClient
        podeEditar={temPermissao(sessao.papel.permissoes, "leads.editar")}
        lead={{
          id: lead.id,
          nome: lead.nome,
          telefone: lead.telefone,
          whatsapp: lead.whatsapp,
          email: lead.email,
          origem: lead.origem,
          etapa: lead.etapa,
          valorPretendido: lead.valorPretendido,
          observacoes: lead.observacoes,
          proximaAcao: lead.proximaAcao ? lead.proximaAcao.toISOString().slice(0, 10) : null,
          corretorId: lead.corretorId,
          imovelId: lead.imovelId,
          clienteId: lead.clienteId,
          corretorNome: lead.corretor?.nome ?? null,
        }}
        interacoes={lead.interacoes.map((i) => ({
          id: i.id,
          tipo: i.tipo,
          descricao: i.descricao,
          criadoEm: i.criadoEm.toISOString(),
        }))}
        opcoes={{
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}
