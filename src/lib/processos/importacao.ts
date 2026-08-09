import { ParteRepresentada } from "@prisma/client";
import { normalizarNumeroCnj } from "@/lib/publicacoes/cnj";
import { ehUfValida } from "@/lib/br/ufs";

export const CABECALHO_CSV_PROCESSOS = [
  "numeroCnj",
  "cliente",
  "varaOrgao",
  "uf",
  "tribunal",
  "parteRepresentada",
  "prazoEmDobro",
] as const;

export const MODELO_CSV_PROCESSOS = [
  CABECALHO_CSV_PROCESSOS.join(","),
  "1234567-89.2025.8.26.0100,João da Silva,1ª Vara Cível,SP,TJSP,AUTOR,não",
].join("\n");

export interface LinhaProcessoCsv {
  numeroCnj: string;
  cliente: string;
  varaOrgao: string;
  uf: string;
  tribunal: string;
  parteRepresentada: ParteRepresentada;
  prazoEmDobro: boolean;
}

export type ResultadoLinhaCsv =
  | { linha: number; status: "valida"; dados: LinhaProcessoCsv }
  | { linha: number; status: "invalida"; erro: string };

export type ResultadoParseCsv =
  | { status: "cabecalho_invalido"; erro: string }
  | { status: "ok"; linhas: ResultadoLinhaCsv[] };

/**
 * Parser CSV minimalista (RFC 4180: campos entre aspas podem conter vírgula,
 * quebra de linha e aspas escapadas como ""). Sem dependência externa — o
 * formato de entrada é o nosso próprio template, não um CSV arbitrário de
 * terceiros, então não vale a pena trazer uma lib só pra isso.
 */
function parseLinhasCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linhaAtual: string[] = [];
  let dentroDeAspas = false;

  const textoNormalizado = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < textoNormalizado.length; i++) {
    const char = textoNormalizado[i];

    if (dentroDeAspas) {
      if (char === '"') {
        if (textoNormalizado[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeAspas = true;
    } else if (char === ",") {
      linhaAtual.push(campo);
      campo = "";
    } else if (char === "\n") {
      linhaAtual.push(campo);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campo = "";
    } else {
      campo += char;
    }
  }
  // última linha, se o arquivo não terminar com quebra de linha
  if (campo.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(campo);
    linhas.push(linhaAtual);
  }

  return linhas.filter((linha) => !(linha.length === 1 && linha[0].trim() === ""));
}

function normalizarParteRepresentada(valor: string): ParteRepresentada | null {
  const normalizado = valor.trim().toUpperCase();
  if (normalizado === "AUTOR") return ParteRepresentada.AUTOR;
  if (normalizado === "REU" || normalizado === "RÉU") return ParteRepresentada.REU;
  if (normalizado === "TERCEIRO") return ParteRepresentada.TERCEIRO;
  return null;
}

function normalizarPrazoEmDobro(valor: string): boolean | null {
  const normalizado = valor.trim().toLowerCase();
  if (["sim", "s", "true", "1", "verdadeiro"].includes(normalizado)) return true;
  if (["nao", "não", "n", "false", "0", "falso", ""].includes(normalizado)) return false;
  return null;
}

/**
 * Interpreta um CSV de processos (template em MODELO_CSV_PROCESSOS) e
 * valida cada linha independentemente — uma linha inválida não invalida as
 * outras, quem chama decide o que fazer com o resultado (ver
 * importarProcessosCsv em acoes.ts). Nunca lança: erro de formato vira
 * `status: "invalida"` por linha, ou `status: "cabecalho_invalido"` se o
 * cabeçalho não bater.
 */
export function parseCsvProcessos(csvText: string): ResultadoParseCsv {
  const linhasBrutas = parseLinhasCsv(csvText.trim());
  if (linhasBrutas.length === 0) {
    return { status: "cabecalho_invalido", erro: "arquivo vazio" };
  }

  const cabecalho = linhasBrutas[0].map((coluna) => coluna.trim());
  const cabecalhoValido =
    cabecalho.length === CABECALHO_CSV_PROCESSOS.length &&
    CABECALHO_CSV_PROCESSOS.every((esperada, indice) => cabecalho[indice] === esperada);

  if (!cabecalhoValido) {
    return {
      status: "cabecalho_invalido",
      erro: `cabeçalho deve ser exatamente: ${CABECALHO_CSV_PROCESSOS.join(",")}`,
    };
  }

  const linhas: ResultadoLinhaCsv[] = linhasBrutas.slice(1).map((colunas, indice) => {
    const numeroLinha = indice + 2; // +1 pelo cabeçalho, +1 porque linha 1 é a primeira linha de dados
    const [numeroCnjBruto, cliente, varaOrgao, uf, tribunal, parteBruta, dobroBruto] = colunas;

    if (colunas.length !== CABECALHO_CSV_PROCESSOS.length) {
      return { linha: numeroLinha, status: "invalida", erro: `esperado ${CABECALHO_CSV_PROCESSOS.length} colunas, veio ${colunas.length}` };
    }

    const numeroCnj = normalizarNumeroCnj(numeroCnjBruto ?? "");
    if (numeroCnj.length !== 20) {
      return { linha: numeroLinha, status: "invalida", erro: "número CNJ inválido — deve ter 20 dígitos" };
    }
    if (!cliente?.trim()) {
      return { linha: numeroLinha, status: "invalida", erro: "cliente em branco" };
    }
    if (!varaOrgao?.trim()) {
      return { linha: numeroLinha, status: "invalida", erro: "vara/órgão em branco" };
    }
    const ufNormalizada = (uf ?? "").trim().toUpperCase();
    if (!ehUfValida(ufNormalizada)) {
      return { linha: numeroLinha, status: "invalida", erro: `UF inválida: "${uf}"` };
    }
    if (!tribunal?.trim()) {
      return { linha: numeroLinha, status: "invalida", erro: "tribunal em branco" };
    }
    const parteRepresentada = normalizarParteRepresentada(parteBruta ?? "");
    if (!parteRepresentada) {
      return { linha: numeroLinha, status: "invalida", erro: `parteRepresentada deve ser AUTOR, REU ou TERCEIRO (veio "${parteBruta}")` };
    }
    const prazoEmDobro = normalizarPrazoEmDobro(dobroBruto ?? "");
    if (prazoEmDobro === null) {
      return { linha: numeroLinha, status: "invalida", erro: `prazoEmDobro deve ser sim/não (veio "${dobroBruto}")` };
    }

    return {
      linha: numeroLinha,
      status: "valida",
      dados: {
        numeroCnj,
        cliente: cliente.trim(),
        varaOrgao: varaOrgao.trim(),
        uf: ufNormalizada,
        tribunal: tribunal.trim(),
        parteRepresentada,
        prazoEmDobro,
      },
    };
  });

  return { status: "ok", linhas };
}
