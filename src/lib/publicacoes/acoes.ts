"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterUsuarioAtual } from "@/lib/auth";
import { processarPublicacoesBrutas } from "./ingestao";
import { calcularPrazosParaPublicacoesVinculadas } from "@/lib/prazos/pipeline";
import { enviarAlertasNovosPendentes } from "@/lib/alertas/alertas";

export type ResultadoBuscaManual =
  | {
      sucesso: true;
      encontradas: number;
      novas: number;
      jaExistentes: number;
      vinculadas: number;
      naoIdentificadas: number;
      prazosCriados: number;
      prazosParaRevisaoManual: number;
    }
  | { sucesso: false; erro: string };

const publicacaoBrutaSchema = z.object({
  identificadorExterno: z.string(),
  conteudo: z.string(),
  dataDisponibilizacao: z.string(),
  dataPublicacao: z.string().nullable(),
  fonte: z.string(),
  rawJson: z.unknown(),
});

const inputSchema = z.array(publicacaoBrutaSchema);

/**
 * Recebe publicações já buscadas no navegador (ver
 * src/lib/publicacoes/buscar-no-navegador.ts — o DJEN bloqueia chamadas
 * vindas da Vercel, então a busca em si roda no navegador de quem clicou) e
 * faz o resto no servidor: persiste (idempotente), tenta vincular a um
 * processo do escritório de quem está logado, classifica e calcula prazo
 * para as que vincularam, dispara alerta de prazos novos pendentes.
 */
export async function processarBuscaDoNavegador(input: unknown): Promise<ResultadoBuscaManual> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: "payload invalido recebido do navegador" };
  }

  const usuario = await obterUsuarioAtual();

  const resultadoIngestao = await processarPublicacoesBrutas(usuario.escritorioId, parsed.data);
  const resultadoPipeline = await calcularPrazosParaPublicacoesVinculadas();
  await enviarAlertasNovosPendentes(resultadoPipeline.prazosCriadosIds);

  revalidatePath("/");
  revalidatePath("/saude");

  return {
    sucesso: true,
    encontradas: resultadoIngestao.encontradas,
    novas: resultadoIngestao.novas,
    jaExistentes: resultadoIngestao.jaExistentes,
    vinculadas: resultadoIngestao.vinculadas,
    naoIdentificadas: resultadoIngestao.naoIdentificadas,
    prazosCriados: resultadoPipeline.prazosCriadosIds.length,
    prazosParaRevisaoManual: resultadoPipeline.paraRevisaoManual,
  };
}
