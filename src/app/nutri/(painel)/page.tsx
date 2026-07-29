import Link from "next/link";
import { obterNutricionistaAtual } from "@/lib/nutri/auth";
import { buscarPacientesDoNutricionista } from "@/lib/nutri/consultas";
import { sairNutricionista } from "../login/actions";

/**
 * Marco 2: lista de pacientes + cadastro. O % de aderência hoje/semana e o
 * destaque de quem está fora da meta entram no Marco 4, quando já existirem
 * registros de refeição pra derivar isso.
 */
export default async function PainelNutri() {
  const nutricionista = await obterNutricionistaAtual();
  const pacientes = await buscarPacientesDoNutricionista(nutricionista.id);
  const vagasRestantes = nutricionista.limitePlano - pacientes.length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">NoSheipe</p>
          <h1 className="font-display text-3xl">Olá, {nutricionista.nome}</h1>
        </div>
        <form action={sairNutricionista}>
          <button
            type="submit"
            className="rounded-sm border border-rule px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-brass hover:text-ink"
          >
            Sair
          </button>
        </form>
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {pacientes.length} de {nutricionista.limitePlano} pacientes do plano
        {vagasRestantes <= 0 ? " — limite atingido" : ""}.
      </p>

      <div className="mt-6">
        {vagasRestantes > 0 ? (
          <Link
            href="/nutri/pacientes/novo"
            className="inline-block rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep"
          >
            + Novo paciente
          </Link>
        ) : (
          <p className="text-sm text-urgent">
            Limite de {nutricionista.limitePlano} pacientes atingido — arquive alguém pra liberar uma vaga.
          </p>
        )}
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {pacientes.map((paciente) => (
          <li key={paciente.id}>
            <Link href={`/nutri/pacientes/${paciente.id}`} className="paper-card block rounded-sm p-4 transition-colors hover:border-brass">
              <p className="font-display text-lg leading-snug">{paciente.nome}</p>
              <p className="mt-1 text-xs text-ink-faint">
                Meta: {paciente.metaKcal} kcal · {paciente.metaProteina}g P · {paciente.metaCarbo}g C ·{" "}
                {paciente.metaGordura}g G
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {pacientes.length === 0 && (
        <p className="mt-8 text-sm text-ink-faint">Nenhum paciente cadastrado ainda.</p>
      )}
    </main>
  );
}
