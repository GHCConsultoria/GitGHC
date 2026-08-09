"use client";

import { useRef, useState, useTransition } from "react";
import { importarProcessosCsv, type ResultadoImportacaoCsv } from "@/lib/processos/acoes";

const ROTULO_STATUS: Record<string, string> = {
  criado: "Criado",
  duplicado: "Já existia — pulado",
  invalida: "Inválida",
};

const COR_STATUS: Record<string, string> = {
  criado: "text-calm",
  duplicado: "text-attention",
  invalida: "text-urgent",
};

export function FormularioImportarCsv() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacaoCsv | null>(null);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function enviarArquivo() {
    const arquivo = inputRef.current?.files?.[0];
    if (!arquivo) return;

    setErroLeitura(null);
    setNomeArquivo(arquivo.name);

    const leitor = new FileReader();
    leitor.onload = () => {
      const texto = typeof leitor.result === "string" ? leitor.result : "";
      iniciarTransicao(async () => {
        const resposta = await importarProcessosCsv(texto);
        setResultado(resposta);
      });
    };
    leitor.onerror = () => setErroLeitura("não foi possível ler o arquivo");
    leitor.readAsText(arquivo, "utf-8");
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="paper-card flex cursor-pointer flex-col items-center gap-2 rounded-sm border-2 border-dashed border-rule p-8 text-center transition-colors hover:border-brass">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={enviarArquivo}
          disabled={pendente}
        />
        <span className="text-sm font-medium text-ink">{nomeArquivo ?? "Clique para escolher um arquivo .csv"}</span>
        <span className="text-xs text-ink-faint">{pendente ? "Importando…" : "Ou arraste aqui"}</span>
      </label>

      {erroLeitura && <p className="text-sm text-urgent">{erroLeitura}</p>}

      {resultado && !resultado.sucesso && <p className="text-sm text-urgent">{resultado.erro}</p>}

      {resultado && resultado.sucesso && (
        <div className="paper-card rounded-sm p-4">
          <p className="text-sm text-ink">
            <strong className="text-calm">{resultado.totalCriados}</strong> processo(s) criado(s) de{" "}
            {resultado.resultados.length} linha(s) processada(s).
          </p>
          <ol className="mt-3 flex max-h-96 flex-col gap-1.5 overflow-y-auto border-t border-rule pt-3 text-xs">
            {resultado.resultados.map((linha) => (
              <li key={linha.linha} className="flex items-baseline gap-2">
                <span className="font-data text-ink-faint">L{linha.linha}</span>
                <span className={COR_STATUS[linha.status]}>{ROTULO_STATUS[linha.status]}</span>
                <span className="truncate text-ink-soft">{linha.numeroCnj ?? linha.erro}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
