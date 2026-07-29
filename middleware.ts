import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTA_LOGIN = "/login";
const ROTA_LOGIN_NUTRI = "/nutri/login";

/**
 * Renova a sessão do Supabase a cada navegação e redireciona para o login
 * certo quando não há usuário autenticado. Duas áreas independentes
 * compartilham o mesmo projeto Supabase Auth mas têm perfis diferentes
 * (Usuario vs Nutricionista — ver src/lib/auth.ts e src/lib/nutri/auth.ts):
 * /nutri/** manda pra /nutri/login, o resto manda pra /login. A rota
 * pública /p/[token] (link do paciente, sem senha) entra como exceção
 * quando existir (Marco 3). Rotas de API ficam fora do matcher abaixo (têm
 * seu próprio esquema de auth — CRON_SECRET no cron, nenhum ainda na
 * ingestão manual — redirecionar uma chamada de API para uma página HTML de
 * login não faz sentido).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
  const ehRotaDeLogin = ehAreaNutri ? pathname.startsWith(ROTA_LOGIN_NUTRI) : pathname.startsWith(ROTA_LOGIN);

  if (!user && !ehRotaDeLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = ehAreaNutri ? ROTA_LOGIN_NUTRI : ROTA_LOGIN;
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
