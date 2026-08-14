import type { Usuario } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotaoStatusPasso } from "@/components/crm/BotaoStatusPasso";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { formatarDiaBR, type SituacaoPasso, situacaoPasso } from "@/lib/crm/atividade";
import { buscarProximosPassosPendentes, type PassoDaAgenda } from "@/lib/crm/consultas";

export const dynamic = "force-dynamic";

const GRUPOS: Array<{ chave: SituacaoPasso; titulo: string; acento: string }> = [
  { chave: "vencido", titulo: "Vencidos", acento: "border-l-urgent-line" },
  { chave: "hoje", titulo: "Para hoje", acento: "border-l-attention-line" },
  { chave: "futuro", titulo: "Próximos", acento: "border-l-calm-line" },
];

export default async function CrmAgenda() {
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

  const agora = new Date();
  const passos = await buscarProximosPassosPendentes(usuario.escritorioId);

  const porGrupo: Record<SituacaoPasso, PassoDaAgenda[]> = { vencido: [], hoje: [], futuro: [] };
  for (const passo of passos) {
    const sit = situacaoPasso(passo, agora);
    if (sit) porGrupo[sit].push(passo);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/crm" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para o painel de vendas
        </Link>
        <p className="eyebrow mt-6 mb-2">CRM comercial</p>
        <h1 className="font-display text-4xl">Agenda comercial</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Todos os próximos passos em aberto, do que já venceu ao que está por vir. Conclua ou cancele direto por aqui.
        </p>
      </header>

      {passos.length === 0 ? (
        <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
          Nenhum próximo passo pendente. Defina próximos passos na página de cada lead.
        </p>
      ) : (
        GRUPOS.map((grupo) => {
          const itens = porGrupo[grupo.chave];
          if (itens.length === 0) return null;
          return (
            <section key={grupo.chave}>
              <div className="mb-4 flex items-baseline justify-between rule pt-6">
                <h2 className="eyebrow pt-4">{grupo.titulo}</h2>
                <span className="font-display pt-4 text-2xl text-ink-faint">
                  {String(itens.length).padStart(2, "0")}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {itens.map((passo) => {
                  const local = [passo.lead.cidade, passo.lead.uf].filter(Boolean).join("/");
                  return (
                    <li
                      key={passo.id}
                      className={`paper-card flex flex-wrap items-center justify-between gap-2 rounded-sm border-l-4 px-4 py-3 ${grupo.acento}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-ink">{passo.descricao}</p>
                        <p className="text-xs text-ink-faint">
                          <Link href={`/crm/leads/${passo.lead.id}`} className="hover:text-brass">
                            {passo.lead.nomeEmpresa}
                          </Link>
                          {local && ` · ${local}`} · {formatarDiaBR(passo.dataPrevista)}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <BotaoStatusPasso passoId={passo.id} acao="CONCLUIR" rotulo="Concluir" tom="calm" />
                        <BotaoStatusPasso passoId={passo.id} acao="CANCELAR" rotulo="Cancelar" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
