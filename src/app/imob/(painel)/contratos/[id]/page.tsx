import Link from "next/link";
import { notFound } from "next/navigation";
import { ContratoDocumentosClient } from "@/components/imob/ContratoDocumentosClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { obterContratoDoTenant } from "@/lib/imob/consultas-fin";
import { formatarData } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";
import { ROTULO_STATUS_CONTRATO, ROTULO_TIPO_CONTRATO, rotulo } from "@/lib/imob/rotulos";

export const dynamic = "force-dynamic";

export default async function ContratoDetalhePage({ params }: { params: { id: string } }) {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "contratos.ver")) {
    notFound();
  }
  const contrato = await obterContratoDoTenant(sessao.imobiliariaId, params.id);
  if (!contrato) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/imob/contratos" className="text-sm text-ink-soft hover:underline">
        ← Contratos
      </Link>

      <section className="paper-card rounded-md p-6">
        <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-soft">
          {rotulo(ROTULO_STATUS_CONTRATO, contrato.status)}
        </span>
        <h1 className="font-display mt-1 text-2xl">{contrato.titulo}</h1>
        <p className="text-sm text-ink-soft">{rotulo(ROTULO_TIPO_CONTRATO, contrato.tipo)}</p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-ink-faint">Início</p>
            <p>{contrato.dataInicio ? formatarData(contrato.dataInicio) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Fim</p>
            <p>{contrato.dataFim ? formatarData(contrato.dataFim) : "—"}</p>
          </div>
        </dl>
        {contrato.observacoes && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{contrato.observacoes}</p>
        )}
      </section>

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow mb-3">Documentos</p>
        <ContratoDocumentosClient
          contratoId={contrato.id}
          podeEditar={temPermissao(sessao.papel.permissoes, "contratos.editar")}
          documentos={contrato.documentos.map((d) => ({
            id: d.id,
            nome: d.nome,
            url: d.url,
            criadoEm: d.criadoEm.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
