import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para uso em Client Components (ex.: formulário de login). */
export function criarClienteSupabaseNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY nao configurados — veja .env.example",
    );
  }
  return createBrowserClient(url, anonKey);
}
