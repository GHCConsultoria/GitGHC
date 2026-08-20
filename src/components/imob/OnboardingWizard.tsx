"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { concluirOnboarding, salvarConfiguracoes } from "@/lib/imob/acoes";

const INPUT = "w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass";
const ETAPAS_IDS = ["dados", "marca", "conclusao"] as const;
const TOTAL_ETAPAS = ETAPAS_IDS.length;

/**
 * Wizard de onboarding: dados da imobiliária → identidade visual → conclusão.
 * A etapa 1 salva de fato (salvarConfiguracoes); a conclusão trava o wizard
 * (concluirOnboarding) e leva ao painel. Sem passos falsos: cada etapa que
 * diz salvar, salva.
 */
export function OnboardingWizard({ nomeImobiliaria, corPrimaria }: { nomeImobiliaria: string; corPrimaria: string }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function salvarEtapa1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await salvarConfiguracoes(fd);
      if (r.sucesso) setEtapa(2);
      else setErro(r.erro);
    });
  }

  function salvarEtapa2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    // a cor precisa acompanhar o nome, pois salvarConfiguracoes valida o nome
    fd.set("nome", nomeImobiliaria);
    start(async () => {
      const r = await salvarConfiguracoes(fd);
      if (r.sucesso) setEtapa(3);
      else setErro(r.erro);
    });
  }

  function finalizar() {
    setErro(null);
    start(async () => {
      const r = await concluirOnboarding();
      if (r.sucesso) router.push("/imob");
      else setErro(r.erro);
    });
  }

  return (
    <div>
      <p className="eyebrow">
        Passo {etapa} de {TOTAL_ETAPAS}
      </p>
      <div className="mt-2 mb-8 flex gap-1.5">
        {ETAPAS_IDS.map((id, i) => (
          <span key={id} className={`h-1 flex-1 rounded-full ${i < etapa ? "bg-brass" : "bg-rule"}`} />
        ))}
      </div>

      {etapa === 1 && (
        <form onSubmit={salvarEtapa1} className="flex flex-col gap-4">
          <h1 className="font-display text-2xl">Dados da imobiliária</h1>
          <p className="text-sm text-ink-soft">Complete o cadastro. Você pode ajustar tudo depois em Configurações.</p>
          <Campo rotulo="Nome" name="nome" defaultValue={nomeImobiliaria} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="CNPJ" name="cnpj" />
            <Campo rotulo="CRECI" name="creci" />
            <Campo rotulo="Telefone" name="telefone" />
            <Campo rotulo="Cidade" name="cidade" />
          </div>
          {erro && <p className="text-sm text-urgent">{erro}</p>}
          <Avancar pending={pending} rotulo="Continuar" />
        </form>
      )}

      {etapa === 2 && (
        <form onSubmit={salvarEtapa2} className="flex flex-col gap-4">
          <h1 className="font-display text-2xl">Identidade visual</h1>
          <p className="text-sm text-ink-soft">Escolha a cor da sua marca (usada em destaques do painel).</p>
          <label className="text-sm">
            <span className="eyebrow mb-1 block">Cor da marca</span>
            <input
              type="color"
              name="corPrimaria"
              defaultValue={corPrimaria}
              className="h-12 w-full rounded-sm border border-rule bg-paper-raised"
            />
          </label>
          {erro && <p className="text-sm text-urgent">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEtapa(1)}
              className="rounded-sm border border-rule px-4 py-2 text-sm"
            >
              Voltar
            </button>
            <Avancar pending={pending} rotulo="Continuar" />
          </div>
        </form>
      )}

      {etapa === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl">Tudo pronto</h1>
          <p className="text-sm text-ink-soft">
            Sua imobiliária está configurada com os papéis padrão (Administrador, Gestor, Corretor, Financeiro,
            Assistente). Entre no painel para cadastrar a equipe e começar.
          </p>
          {erro && <p className="text-sm text-urgent">{erro}</p>}
          <button
            type="button"
            onClick={finalizar}
            disabled={pending}
            className="rounded-sm bg-brass px-4 py-2.5 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50"
          >
            {pending ? "Abrindo…" : "Ir para o painel"}
          </button>
        </div>
      )}
    </div>
  );
}

function Avancar({ pending, rotulo }: { pending: boolean; rotulo: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50"
    >
      {pending ? "Salvando…" : rotulo}
    </button>
  );
}

function Campo({
  rotulo,
  name,
  defaultValue,
  required,
}: {
  rotulo: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="eyebrow mb-1 block">{rotulo}</span>
      <input name={name} defaultValue={defaultValue} required={required} className={INPUT} />
    </label>
  );
}
