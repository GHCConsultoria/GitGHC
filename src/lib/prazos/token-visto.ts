const DIAS_EXPIRACAO = 14;

function base64UrlDeBytes(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesDeBase64Url(valor: string): Uint8Array {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function segredo(): string {
  const valor = process.env.LINK_ACOES_SECRET;
  if (!valor) {
    throw new Error("LINK_ACOES_SECRET nao configurado — veja .env.example");
  }
  return valor;
}

async function chaveHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Gera o token do link "marcar como visto" enviado no botão do WhatsApp —
 * sem exigir login (o token em si é a credencial, mesmo padrão do link do
 * paciente no NoSheipe). Formato: "prazoId.expiraEm.assinatura".
 */
export async function gerarTokenMarcarVisto(prazoId: string): Promise<string> {
  const expiraEm = Date.now() + DIAS_EXPIRACAO * 24 * 60 * 60 * 1000;
  const payload = `${prazoId}.${expiraEm}`;
  const chave = await chaveHmac();
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(payload));
  return `${payload}.${base64UrlDeBytes(new Uint8Array(assinatura))}`;
}

/** Verifica o token; retorna o prazoId se válido e não expirado, senão null. */
export async function verificarTokenMarcarVisto(token: string): Promise<string | null> {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [prazoId, expiraEmStr, assinaturaB64] = partes;
  const expiraEm = Number(expiraEmStr);
  if (!prazoId || !Number.isFinite(expiraEm) || Date.now() > expiraEm) return null;

  const payload = `${prazoId}.${expiraEmStr}`;
  const chave = await chaveHmac();
  try {
    const assinaturaValida = await crypto.subtle.verify(
      "HMAC",
      chave,
      bytesDeBase64Url(assinaturaB64).buffer as ArrayBuffer,
      new TextEncoder().encode(payload),
    );
    return assinaturaValida ? prazoId : null;
  } catch {
    return null;
  }
}
