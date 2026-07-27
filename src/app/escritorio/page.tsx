import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { FormularioEditarEscritorio } from "@/components/escritorio/FormularioEditarEscritorio";

export const dynamic = "force-dynamic";

export default async function Escritorio() {
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

  const escritorio = await prisma.escritorio.findUniqueOrThrow({ where: { id: usuario.escritorioId } });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para a conferência de prazos
        </Link>
        <p className="eyebrow mt-6 mb-2">Cadastro</p>
        <h1 className="font-display text-4xl">Escritório</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          A OAB cadastrada aqui é a que a ingestão do DJEN usa pra buscar publicações — troque o valor de
          demonstração pela OAB real antes de testar a busca de verdade.
        </p>
      </header>

      <FormularioEditarEscritorio nomeInicial={escritorio.nome} oabInicial={escritorio.oab} ufInicial={escritorio.uf} />
    </main>
  );
}
