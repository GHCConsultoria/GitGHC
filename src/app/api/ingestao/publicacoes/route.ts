import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DjenProvider } from "@/lib/publicacoes/djen-provider";
import { ingerirPublicacoes } from "@/lib/publicacoes/ingestao";

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const corpoSchema = z.object({
  escritorioId: z.string().min(1),
  dataInicio: z.string().regex(DATA_REGEX, "use o formato AAAA-MM-DD"),
  dataFim: z.string().regex(DATA_REGEX, "use o formato AAAA-MM-DD"),
});

export async function POST(request: NextRequest) {
  const corpoBruto: unknown = await request.json().catch(() => null);
  const parsed = corpoSchema.safeParse(corpoBruto);
  if (!parsed.success) {
    return NextResponse.json(
      { erro: "payload invalido", detalhes: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const escritorio = await prisma.escritorio.findUnique({
    where: { id: parsed.data.escritorioId },
  });
  if (!escritorio) {
    return NextResponse.json({ erro: "escritorio nao encontrado" }, { status: 404 });
  }

  const resultado = await ingerirPublicacoes(
    {
      escritorioId: escritorio.id,
      // Escritorio.oab é guardado formatado (ex.: "123456/SP"); a API do DJEN
      // espera só os dígitos do número de inscrição.
      oab: escritorio.oab.replace(/\D/g, ""),
      uf: escritorio.uf,
      dataInicio: parsed.data.dataInicio,
      dataFim: parsed.data.dataFim,
    },
    new DjenProvider(),
  );

  return NextResponse.json(resultado);
}
