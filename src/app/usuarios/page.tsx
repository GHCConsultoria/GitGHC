import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { buscarUsuariosDoEscritorio } from "@/lib/usuarios/consultas";
import { FormularioNovoUsuario } from "@/components/usuarios/FormularioNovoUsuario";
import { FormularioTelefoneWhatsapp } from "@/components/usuarios/FormularioTelefoneWhatsapp";

export const dynamic = "force-dynamic";

const ROTULO_ROLE: Record<string, string> = {
  ADVOGADO: "Advogado",
  ASSISTENTE: "Assistente",
};

export default async function Usuarios() {
  let usuarioAtual;
  try {
    usuarioAtual = await obterUsuarioAtual();
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

  const usuarios = await buscarUsuariosDoEscritorio(usuarioAtual.escritorioId);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para a conferência de prazos
        </Link>
        <p className="eyebrow mt-6 mb-2">Cadastro</p>
        <h1 className="font-display text-4xl">Usuários</h1>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Cria login para mais alguém do escritório. A senha temporária aparece só uma vez, na hora da criação.
        </p>
      </header>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Novo usuário</h2>
        <FormularioNovoUsuario />
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between rule pt-6">
          <h2 className="eyebrow pt-4">Cadastrados</h2>
          <span className="font-display pt-4 text-2xl text-ink-faint">{String(usuarios.length).padStart(2, "0")}</span>
        </div>

        <ul className="flex flex-col gap-3">
          {usuarios.map((usuario) => (
            <li key={usuario.id} className="paper-card rounded-sm p-4">
              <p className="font-display text-lg leading-snug">{usuario.nome}</p>
              <p className="font-data text-sm text-ink-soft">{usuario.email}</p>
              <p className="mt-1 text-xs text-ink-faint">{ROTULO_ROLE[usuario.role] ?? usuario.role}</p>
              <FormularioTelefoneWhatsapp usuarioId={usuario.id} telefoneInicial={usuario.telefoneWhatsapp} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
