/**
 * Abstração de armazenamento de mídia (fotos de imóvel). O produto guarda no
 * banco apenas a URL pública da imagem (FotoImovel.url); o binário mora num
 * storage externo. Esta camada isola o resto do sistema do provedor concreto,
 * para trocar Supabase Storage por S3/Cloudinary sem tocar em domínio/UI.
 *
 * Fase 2: a UI cadastra fotos por URL (o corretor cola o link da imagem já
 * hospedada). O upload de binário via Supabase Storage entra por aqui na fase
 * de mídia, implementando `enviarArquivo` no provedor Supabase — sem mudar as
 * chamadas existentes. Nada aqui finge funcionar: enquanto não houver bucket
 * configurado, `enviarArquivo` lança com instrução clara.
 */

export interface ProvedorStorage {
  /** Faz upload e devolve a URL pública. */
  enviarArquivo(caminho: string, arquivo: Blob, contentType: string): Promise<string>;
  /** Remove o arquivo pela URL/caminho. */
  removerArquivo(url: string): Promise<void>;
}

const BUCKET = process.env.IMOB_STORAGE_BUCKET ?? "imob-fotos";

/**
 * Provedor Supabase Storage. Reaproveita o client admin (service role) já
 * existente. Só é instanciável quando o Supabase está configurado; caso
 * contrário, as telas caem no cadastro por URL, sem quebrar.
 */
export function criarProvedorSupabaseStorage(): ProvedorStorage {
  return {
    async enviarArquivo(caminho, arquivo, contentType) {
      const { criarClienteSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = criarClienteSupabaseAdmin();
      const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType, upsert: true });
      if (error) {
        throw new Error(`falha no upload para o storage: ${error.message}`);
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      return data.publicUrl;
    },
    async removerArquivo(url) {
      const { criarClienteSupabaseAdmin } = await import("@/lib/supabase/admin");
      const supabase = criarClienteSupabaseAdmin();
      // extrai o caminho relativo depois de "/<BUCKET>/"
      const marcador = `/${BUCKET}/`;
      const idx = url.indexOf(marcador);
      const caminho = idx >= 0 ? url.slice(idx + marcador.length) : url;
      await supabase.storage.from(BUCKET).remove([caminho]);
    },
  };
}

/**
 * Valida uma URL de imagem colada pelo usuário (cadastro por URL da Fase 2).
 * Aceita http(s) e data URL de imagem; recusa o resto para não guardar lixo.
 */
export function urlDeImagemValida(url: string): boolean {
  const v = url.trim();
  if (/^https?:\/\/.+/i.test(v)) return true;
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(v)) return true;
  return false;
}
