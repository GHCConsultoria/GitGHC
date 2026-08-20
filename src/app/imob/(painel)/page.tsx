import { obterSessaoImob } from "@/lib/imob/auth";
import { resumoPainel } from "@/lib/imob/consultas";

export const dynamic = "force-dynamic";

/**
 * Painel inicial. Na Fase 1 mostra o resumo da conta (usuários, papéis,
 * auditoria) — os KPIs comerciais (imóveis, leads, vendas, comissões) entram
 * conforme os módulos das próximas fases forem implementados de verdade, para
 * não exibir números falsos.
 */
export default async function PainelImob() {
  const sessao = await obterSessaoImob();
  const resumo = await resumoPainel(sessao.imobiliariaId);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Painel</p>
        <h1 className="font-display text-3xl">Olá, {sessao.nome.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-ink-soft">{sessao.imobiliaria.nome}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Cartao rotulo="Usuários ativos" valor={resumo.usuariosAtivos} />
        <Cartao rotulo="Papéis" valor={resumo.papeis} />
        <Cartao rotulo="Eventos de auditoria" valor={resumo.eventosAuditoria} />
      </section>

      <section className="paper-card rounded-md p-6">
        <p className="eyebrow">Próximos módulos</p>
        <h2 className="font-display mt-1 text-xl">Base pronta</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Autenticação, multi-tenancy, usuários e permissões estão no ar. Os módulos comerciais — imóveis,
          proprietários, clientes, CRM/leads, visitas, propostas, vendas, locações, contratos, financeiro, comissões,
          relatórios — entram nas próximas fases, cada um com banco, validação e autorização reais.
        </p>
      </section>
    </div>
  );
}

function Cartao({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="paper-card rounded-md p-5">
      <p className="eyebrow">{rotulo}</p>
      <p className="font-display mt-2 text-3xl">{valor}</p>
    </div>
  );
}
