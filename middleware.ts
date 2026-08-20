import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTA_LOGIN = "/login";
const ROTA_LOGIN_NUTRI = "/nutri/login";
const ROTA_LOGIN_IMOB = "/imob/login";
const ROTA_CADASTRO = "/cadastro";

/**
 * Renova a sessão do Supabase a cada navegação e redireciona para o login
 * certo quando não há usuário autenticado. Duas áreas independentes
 * compartilham o mesmo projeto Supabase Auth mas têm perfis diferentes
 * (Usuario vs Nutricionista — ver src/lib/auth.ts e src/lib/nutri/auth.ts):
 * /nutri/** manda pra /nutri/login, o resto manda pra /login. /p/[token] é
 * o link do paciente — sem senha nenhuma, o token na própria URL é a
 * credencial — então fica fora do gate de sessão inteiramente. /cadastro é
 * o cadastro público de escritório (ver src/lib/cadastro/acoes.ts) — fica
 * de fora do gate pelo mesmo motivo que /login: quem chega ali ainda não
 * tem sessão nenhuma. Rotas de API ficam fora do matcher abaixo (têm seu
 * próprio esquema de auth — CRON_SECRET no cron, o token no corpo em
 * /api/nutri/registros — redirecionar uma chamada de API para uma página
 * HTML de login não faz sentido).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (request.nextUrl.pathname.startsWith("/p/")) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Supabase ainda não configurado neste ambiente — deixa passar sem
    // checar sessão em vez de travar o app inteiro.
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaDefinir) {
        for (const { name, value } of cookiesParaDefinir) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaDefinir) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const ehAreaNutri = pathname.startsWith("/nutri");
  const ehAreaImob = pathname.startsWith("/imob");
  let rotaDeLogin = ROTA_LOGIN;
  if (ehAreaNutri) rotaDeLogin = ROTA_LOGIN_NUTRI;
  else if (ehAreaImob) rotaDeLogin = ROTA_LOGIN_IMOB;

  const ehRotaDeLogin = pathname.startsWith(rotaDeLogin);
  const ehRotaDeCadastro = !ehAreaNutri && !ehAreaImob && pathname.startsWith(ROTA_CADASTRO);

  if (!user && !ehRotaDeLogin && !ehRotaDeCadastro) {
    const destino = request.nextUrl.clone();
    destino.pathname = rotaDeLogin;
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
