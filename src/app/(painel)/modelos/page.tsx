import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarModelosDoEscritorio } from "@/lib/modelos/consultas";
import { PLACEHOLDERS_MODELO } from "@/lib/modelos/preenchimento";
import { PainelModelos } from "@/components/modelos/PainelModelos";

export const dynamic = "force-dynamic";

export default async function Modelos() {
  let usuario;
  try {
    usuario = await obterUsuarioAtual();
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

  const [modelos, tiposAtoPrazo] = await Promise.all([
    buscarModelosDoEscritorio(usuario.escritorioId),
    prisma.tipoAtoPrazo.findMany({ orderBy: { tipoAto: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar
        </Link>
        <p className="eyebrow mt-6 mb-2">Cadastro</p>
        <h1 className="font-display text-4xl">Modelos de petição</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Modelos editáveis do escritório, preenchidos automaticamente com os dados do prazo, sem IA e sempre
          previsível. Use{" "}
          {PLACEHOLDERS_MODELO.map((placeholder, indice) => (
            <span key={placeholder}>
              <code className="font-data text-xs text-brass">{`{{${placeholder}}}`}</code>
              {indice < PLACEHOLDERS_MODELO.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          dentro do texto.
        </p>
      </header>

      <PainelModelos modelos={modelos} tiposAtoPrazo={tiposAtoPrazo.map((t) => t.tipoAto)} />
    </main>
  );
}
