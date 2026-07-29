import { obterNutricionistaAtual } from "@/lib/nutri/auth";
import { sairNutricionista } from "../login/actions";

/**
 * Marco 1: só confirma que o auth do nutricionista está de pé. CRUD de
 * paciente + painel de aderência entram nos próximos marcos.
 */
export default async function PainelNutri() {
  const nutricionista = await obterNutricionistaAtual();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="eyebrow">Nutrição · demo</p>
      <h1 className="font-display mt-1 text-3xl">Olá, {nutricionista.nome}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Plano até {nutricionista.limitePlano} pacientes. Nenhum paciente cadastrado ainda.
      </p>

      <form action={sairNutricionista} className="mt-8">
        <button
          type="submit"
          className="rounded-sm border border-rule px-4 py-2 text-sm text-ink-soft transition-colors hover:border-brass hover:text-ink"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
