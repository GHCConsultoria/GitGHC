export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export type Uf = (typeof UFS_BRASIL)[number];

export function ehUfValida(valor: unknown): valor is Uf {
  return typeof valor === "string" && (UFS_BRASIL as readonly string[]).includes(valor);
}

