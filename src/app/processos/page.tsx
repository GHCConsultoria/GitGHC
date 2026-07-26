import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarProcessosDoEscritorio } from "@/lib/processos/consultas";
import { FormularioNovoProcesso } from "@/components/processos/FormularioNovoProcesso";

export const dynamic = "force-dynamic";

export default async function Processos() {
  let usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) {
      redirect("/login");
    }
    if (erro instanceof UsuarioNaoCadastradoError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6 text-center">
          <p className="eyebrow">Conta sem acesso</p>
          <h1 className="font-display text-2xl">Seu login foi reconhecido, mas falta um cadastro</h1>
          <p className="text-sm text-ink-soft">
            Não há um usuário cadastrado para você neste escritório. Peça para o administrador te cadastrar.
          </p>
        </main>
      );
    }
    throw erro;
  }

  const processos = await buscarProcessosDoEscritorio(usuario.escritorioId);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para a conferência de prazos
        </Link>
        <p className="eyebrow mt-6 mb-2">Cadastro</p>
        <h1 className="font-display text-4xl">Processos</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          A ingestão do DJEN só vincula uma publicação automaticamente a um processo que já esteja cadastrado aqui,
          pelo número CNJ.
        </p>
      </header>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Novo processo</h2>
        <FormularioNovoProcesso />
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Cadastrados</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">
            {String(processos.length).padStart(2, "0")}
          </span>
        </div>

        {processos.length === 0 ? (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            Nenhum processo cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {processos.map((processo) => (
              <li key={processo.id} className="paper-card rounded-sm p-4">
                <p className="font-display text-lg leading-snug">{processo.cliente}</p>
                <p className="text-sm text-ink-soft">{processo.varaOrgao}</p>
                <p className="mt-1 font-data text-xs text-ink-faint">
                  {processo.numeroCnj} · {processo.tribunal}/{processo.uf}
                  {processo.prazoEmDobro && " · prazo em dobro"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
