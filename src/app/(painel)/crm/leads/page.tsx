import type { Usuario } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EtiquetaEstagio } from "@/components/crm/EtiquetaEstagio";
import { FormularioMotivoPerda } from "@/components/crm/FormularioMotivoPerda";
import { FormularioNovoLead } from "@/components/crm/FormularioNovoLead";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarLeadsDoEscritorio, buscarMotivosPerdaAtivos } from "@/lib/crm/consultas";
import { ROTULO_ORIGEM } from "@/lib/crm/funil";
import { formatarMoeda } from "@/lib/crm/moeda";

export const dynamic = "force-dynamic";

export default async function CrmLeads() {
  let usuario: Usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) redirect("/login");
    if (erro instanceof UsuarioNaoCadastradoError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6 text-center">
          <p className="eyebrow">Conta sem acesso</p>
          <h1 className="font-display text-2xl">Seu login foi reconhecido, mas falta um cadastro</h1>
          <p className="text-sm text-ink-soft">Peça para o administrador te cadastrar.</p>
        </main>
      );
    }
    throw erro;
  }

  const [leads, motivos] = await Promise.all([
    buscarLeadsDoEscritorio(usuario.escritorioId),
    buscarMotivosPerdaAtivos(usuario.escritorioId),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/crm" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para o painel de vendas
        </Link>
        <p className="eyebrow mt-6 mb-2">CRM comercial</p>
        <h1 className="font-display text-4xl">Leads</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Cada empresa que você prospecta ou visita. Clique num lead para registrar visitas, próximos passos e mover no
          funil.
        </p>
      </header>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Novo lead</h2>
        <FormularioNovoLead />
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Carteira</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">{String(leads.length).padStart(2, "0")}</span>
        </div>

        {leads.length === 0 ? (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            Nenhum lead cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {leads.map((lead) => {
              const local = [lead.cidade, lead.uf].filter(Boolean).join("/");
              return (
                <li key={lead.id} className="paper-card rounded-sm p-4">
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="group flex flex-wrap items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-lg leading-snug transition-colors group-hover:text-brass">
                        {lead.nomeEmpresa}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {lead.nicho}
                        {local && ` · ${local}`}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {ROTULO_ORIGEM[lead.origem]}
                        {lead._count.visitas > 0 && ` · ${lead._count.visitas} visita(s)`}
                        {lead._count.proximosPassos > 0 && ` · ${lead._count.proximosPassos} passo(s)`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <EtiquetaEstagio estagio={lead.estagio} />
                      {lead.estagio === "GANHO" && lead.valorFechadoCentavos != null ? (
                        <span className="font-data text-xs text-calm">{formatarMoeda(lead.valorFechadoCentavos)}</span>
                      ) : lead.valorPotencialCentavos != null ? (
                        <span className="font-data text-xs text-ink-faint">
                          {formatarMoeda(lead.valorPotencialCentavos)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-2 rule pt-6">Motivos de perda</h2>
        <p className="mb-4 max-w-lg text-sm text-ink-soft">
          O catálogo que você escolhe ao marcar um lead como perdido — é o que alimenta o gráfico “por que perdemos”.
        </p>
        <div className="paper-card flex flex-col gap-3 rounded-sm p-4">
          <FormularioMotivoPerda />
          {motivos.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {motivos.map((m) => (
                <li key={m.id} className="rounded-full border border-rule bg-paper px-2.5 py-0.5 text-xs text-ink-soft">
                  {m.descricao}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
