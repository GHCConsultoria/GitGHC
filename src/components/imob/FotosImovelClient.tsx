"use client";

import { useState, useTransition } from "react";
import { CLASSE_BOTAO_PRIMARIO, CLASSE_INPUT, Mensagem } from "@/components/imob/primitivos";
import { adicionarFoto, definirFotoPrincipal, removerFoto } from "@/lib/imob/acoes-cadastros";

interface Foto {
  id: string;
  url: string;
  legenda: string | null;
  principal: boolean;
}

/**
 * Galeria + gestão de fotos do imóvel. Fase 2: adiciona por URL (o binário
 * entra pela camada de storage sem mudar este componente). Define principal e
 * remove. Somente aparece para quem pode editar imóvel.
 */
export function FotosImovelClient({
  imovelId,
  fotos,
  podeEditar,
}: {
  imovelId: string;
  fotos: Foto[];
  podeEditar: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function acao(fn: (fd: FormData) => Promise<{ sucesso: boolean; erro?: string }>, fd: FormData) {
    setErro(null);
    start(async () => {
      const r = await fn(fd);
      if (!r.sucesso) setErro(r.erro ?? "erro");
    });
  }

  function onAdicionar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("imovelId", imovelId);
    acao(adicionarFoto, fd);
    form.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      {fotos.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhuma foto cadastrada.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {fotos.map((f) => (
            <figure key={f.id} className="overflow-hidden rounded-md border border-rule">
              <div className="aspect-video bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.legenda ?? "Foto do imóvel"} className="h-full w-full object-cover" />
              </div>
              <figcaption className="flex items-center justify-between gap-2 p-2 text-xs">
                <span className={f.principal ? "font-medium text-brass-deep" : "text-ink-soft"}>
                  {f.principal ? "Principal" : f.legenda || "Foto"}
                </span>
                {podeEditar && (
                  <span className="flex gap-2">
                    {!f.principal && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("imovelId", imovelId);
                          fd.set("fotoId", f.id);
                          acao(definirFotoPrincipal, fd);
                        }}
                        className="text-ink-soft hover:underline"
                      >
                        Tornar principal
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("Remover esta foto?")) return;
                        const fd = new FormData();
                        fd.set("imovelId", imovelId);
                        fd.set("fotoId", f.id);
                        acao(removerFoto, fd);
                      }}
                      className="text-ink-soft hover:text-urgent hover:underline"
                    >
                      Remover
                    </button>
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {podeEditar && (
        <form onSubmit={onAdicionar} className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm">
            <span className="eyebrow mb-1 block">Adicionar foto por URL</span>
            <input name="url" type="url" required placeholder="https://…" className={CLASSE_INPUT} />
          </label>
          <input name="legenda" placeholder="Legenda (opcional)" className={`${CLASSE_INPUT} max-w-[12rem]`} />
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "…" : "Adicionar"}
          </button>
        </form>
      )}
      <Mensagem erro={erro} />
    </div>
  );
}
