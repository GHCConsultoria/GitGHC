import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { MODELO_CSV_PROCESSOS } from "@/lib/processos/importacao";
import { FormularioImportarCsv } from "@/components/processos/FormularioImportarCsv";

export const dynamic = "force-dynamic";

export default async function ImportarProcessos() {
  try {
    await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) redirect("/login");
    if (erro instanceof UsuarioNaoCadastradoError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6 text-center">
          <p className="eyebrow">Conta sem acesso</p>
          <h1 className="font-display text-2xl">Seu login foi reconhecido, mas falta um cadastro</h1>
        </main>
      );
    }
    throw erro;
  }

  const dataUriModelo = `data:text/csv;charset=utf-8,${encodeURIComponent(MODELO_CSV_PROCESSOS)}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/processos" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para processos
        </Link>
        <p className="eyebrow mt-6 mb-2">Cadastro em lote</p>
        <h1 className="font-display text-4xl">Importar processos</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Migrando de outro sistema? Suba um CSV com a carteira inteira de uma vez, em vez de cadastrar processo por
          processo.
        </p>
      </header>

      <section>
        <div className="paper-card rounded-sm p-5">
          <p className="eyebrow mb-2">Formato esperado</p>
          <p className="text-sm text-ink-soft">
            Um arquivo CSV com o cabeçalho exato abaixo (vírgula como separador, campos com vírgula interna entre
            aspas):
          </p>
          <pre className="mt-3 overflow-x-auto rounded-sm border border-rule bg-paper p-3 font-data text-xs text-ink-soft">
            {MODELO_CSV_PROCESSOS}
          </pre>
          <p className="mt-2 text-xs text-ink-faint">
            parteRepresentada: AUTOR, REU ou TERCEIRO. prazoEmDobro: sim ou não.
          </p>
          <a
            href={dataUriModelo}
            download="modelo-processos.csv"
            className="mt-3 inline-block text-xs text-brass underline decoration-dotted hover:text-brass-deep"
          >
            Baixar modelo em branco
          </a>
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Arquivo</h2>
        <FormularioImportarCsv />
      </section>
    </main>
  );
}
