import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTA_LOGIN = "/login";

/**
 * Renova a sessão do Supabase a cada navegação e redireciona para /login
 * quando não há usuário autenticado. Rotas de API ficam fora do matcher
 * abaixo (têm seu próprio esquema de auth — CRON_SECRET no cron, nenhum
 * ainda na ingestão manual — redirecionar uma chamada de API para uma
 * página HTML de login não faz sentido).
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

  const ehRotaDeLogin = request.nextUrl.pathname.startsWith(ROTA_LOGIN);
  if (!user && !ehRotaDeLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTA_LOGIN;
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
