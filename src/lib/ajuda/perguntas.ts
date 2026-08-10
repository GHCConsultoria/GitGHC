export interface PerguntaAjuda {
  id: string;
  categoria: string;
  pergunta: string;
  resposta: string;
  /** Palavras extras pra achar essa pergunta na busca, além do texto da própria pergunta/resposta. */
  palavrasChave?: string[];
}

/**
 * Base de conhecimento fixa da central de ajuda (ver ChatAjuda.tsx) — sem
 * IA, sem chamada de rede: só busca por palavra-chave num array local.
 * Cobre as dúvidas mais prováveis de quem está começando a usar o sistema.
 * Atualize aqui sempre que uma funcionalidade nova entrar no ar.
 */
export const PERGUNTAS_AJUDA: PerguntaAjuda[] = [
  {
    id: "confirmar-prazo",
    categoria: "Prazos",
    pergunta: "Como confirmo um prazo?",
    resposta:
      "Na seção \"Aguardando confirmação\" do painel, cada prazo calculado pelo sistema aparece com o passo a passo do cálculo. Clique em \"Confirmar\" pra aceitar a data proposta, ou em \"Editar data\" se precisar corrigir algo (nesse caso é obrigatório explicar o motivo). Só usuários com papel Advogado podem confirmar.",
    palavrasChave: ["confirmação", "confirmar", "aceitar prazo"],
  },
  {
    id: "conferencia-automatica",
    categoria: "Prazos",
    pergunta: "O que é a \"conferência automática\" que aparece antes de eu confirmar?",
    resposta:
      "Antes de você confirmar, o sistema refaz o cálculo do prazo do zero com os mesmos dados originais. Se o calendário de feriados foi corrigido ou a configuração daquele tipo de ato mudou depois que o prazo foi calculado pela primeira vez, isso aparece como uma divergência, com a data recalculada. Sem divergência, aparece um aviso verde confirmando que está tudo igual.",
    palavrasChave: ["divergência", "recálculo", "recalculado"],
  },
  {
    id: "modo-paranoia",
    categoria: "Prazos",
    pergunta: "O que é a seção \"Riscos\" no topo do painel?",
    resposta:
      "É o que o sistema chama de modo paranoia jurídica: uma varredura que sinaliza tudo que deveria estar incomodando alguém. Prazo perto do vencimento e ainda não confirmado, prazo sem nenhuma tarefa registrada, alerta de WhatsApp que ninguém confirmou ter visto, ou calendário de feriados de alguma UF que ainda não foi revisado.",
    palavrasChave: ["risco", "alerta", "paranoia"],
  },
  {
    id: "marcar-cumprido",
    categoria: "Prazos",
    pergunta: "Como marco um prazo como cumprido?",
    resposta:
      "Na seção \"Confirmados\", clique em \"Marcar como cumprido\". O sistema vai pedir o número do protocolo (obrigatório) e, opcionalmente, um link do comprovante e uma observação. Isso fica registrado como evidência de que o ato foi de fato praticado, não só uma alegação.",
    palavrasChave: ["protocolo", "comprovante", "evidência"],
  },
  {
    id: "dias-uteis-corridos",
    categoria: "Prazos",
    pergunta: "Como o sistema calcula a data fatal do prazo?",
    resposta:
      "O motor segue o CPC à risca: considera-se publicado no 1º dia útil após a disponibilização (art. 224 §2º), a contagem começa no 1º dia útil seguinte à publicação (art. 224 §3º), e o vencimento é protraído pro próximo dia útil se cair num dia sem expediente. Cada prazo confirmado mostra o passo a passo completo do cálculo, clicando em \"Como foi calculada\".",
    palavrasChave: ["cálculo", "cpc", "dias úteis", "dias corridos"],
  },
  {
    id: "modelos-peticao",
    categoria: "Petições",
    pergunta: "Como uso os modelos de petição?",
    resposta:
      "Em \"Modelos\", cadastre um texto com placeholders tipo {{cliente}}, {{numeroCnj}} e {{dataFatal}}. Na tela de prazos confirmados, escolha o modelo no seletor ao lado de \"Gerar rascunho com IA\" e clique em \"Usar modelo\": o texto vem preenchido automaticamente com os dados daquele prazo, sem usar IA, então o resultado é sempre previsível.",
    palavrasChave: ["template", "placeholder", "modelo"],
  },
  {
    id: "rascunho-ia",
    categoria: "Petições",
    pergunta: "Como funciona o \"Gerar rascunho com IA\"?",
    resposta:
      "A partir de um prazo já confirmado, a IA escreve um rascunho inicial de peça usando os dados do processo e o histórico dos últimos atos. Ela nunca inventa fato, valor ou jurisprudência: quando falta informação, marca [A PREENCHER: ...] em vez de supor. É sempre só um ponto de partida; revise tudo antes de protocolar.",
    palavrasChave: ["ia", "inteligência artificial", "rascunho"],
  },
  {
    id: "importar-csv",
    categoria: "Processos",
    pergunta: "Como importo vários processos de uma vez?",
    resposta:
      "Em \"Processos\", clique em \"Importar vários processos de uma vez (CSV)\". A própria página tem um modelo pra baixar com o cabeçalho certo. Cada linha é validada de forma independente: uma linha com erro não trava as outras, e processo duplicado é só pulado, não gera erro.",
    palavrasChave: ["csv", "lote", "planilha", "migrar"],
  },
  {
    id: "nao-identificada",
    categoria: "Processos",
    pergunta: "O que faço com uma publicação \"não identificada\"?",
    resposta:
      "Significa que a ingestão automática não conseguiu achar o número do processo cadastrado no sistema. Na seção \"Não identificadas\", vincule manualmente a um processo já existente ou cadastre um processo novo direto por ali (os campos vêm pré-preenchidos quando dá pra sugerir a partir do texto).",
    palavrasChave: ["não identificada", "vincular", "sem processo"],
  },
  {
    id: "cron-falhou",
    categoria: "Processos",
    pergunta: "Por que o Painel de saúde mostra o cron diário como \"Falhou\"?",
    resposta:
      "É esperado, não é um problema. O cron roda no servidor, e o DJEN bloqueia consultas vindas de infraestrutura de nuvem. A ingestão de verdade acontece pelo card \"Ingestão\" no painel principal, que roda direto do navegador de quem está logado (sem esse bloqueio) e dispara sozinho ao abrir a página, no máximo a cada 6 horas.",
    palavrasChave: ["cron", "falhou", "403", "painel de saúde", "djen bloqueado"],
  },
  {
    id: "novo-escritorio",
    categoria: "Conta",
    pergunta: "Como cadastro um escritório novo?",
    resposta:
      "Na tela de login, clique em \"Cadastre seu escritório\". Você entra como o primeiro usuário, com papel Advogado, e já cai direto no painel, logado. Outros usuários do mesmo escritório são adicionados depois em \"Usuários\".",
    palavrasChave: ["cadastro", "criar conta", "novo usuário"],
  },
  {
    id: "papeis",
    categoria: "Conta",
    pergunta: "Qual a diferença entre Advogado e Assistente?",
    resposta:
      "Os dois veem exatamente as mesmas informações do escritório. A diferença é só nas ações de responsabilidade legal: confirmar, editar ou descartar prazo, marcar prazo como cumprido e cadastrar usuário novo são exclusivas de quem tem papel Advogado.",
    palavrasChave: ["permissão", "papel", "role", "assistente"],
  },
  {
    id: "alertas",
    categoria: "Alertas",
    pergunta: "Como funcionam os alertas de prazo?",
    resposta:
      "Por e-mail, automaticamente na criação do prazo e nos marcos de 5, 2 e 1 dia antes do vencimento. Por WhatsApp, se o escritório tiver essa integração configurada, com um botão pra marcar que alguém viu o alerta. Sem WhatsApp configurado, os alertas continuam chegando só por e-mail.",
    palavrasChave: ["email", "e-mail", "whatsapp", "notificação"],
  },
  {
    id: "app-celular",
    categoria: "App",
    pergunta: "Dá pra instalar o sistema como um app no celular?",
    resposta:
      "Sim. Abra o site pelo navegador do celular e use \"Adicionar à tela inicial\" (no Android, geralmente no menu de três pontinhos do Chrome; no iPhone, no botão de compartilhar do Safari). Depois disso abre direto com ícone próprio, sem a barra de endereço.",
    palavrasChave: ["pwa", "instalar", "celular", "mobile", "app"],
  },
  {
    id: "tema",
    categoria: "App",
    pergunta: "Como troco entre tema claro e escuro?",
    resposta:
      "No rodapé da barra lateral, clique em \"Tema\". A escolha fica salva no seu navegador e vale pras próximas visitas. Por padrão o sistema abre no tema claro.",
    palavrasChave: ["dark mode", "modo escuro", "modo claro"],
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Busca por palavra-chave pura (sem IA) na base de ajuda: pontua cada
 * pergunta por quantos termos da consulta aparecem na pergunta, resposta ou
 * palavras-chave, e devolve as mais relevantes primeiro. String vazia
 * devolve tudo (usado pra listar as perguntas de uma categoria).
 */
export function buscarPerguntas(consulta: string): PerguntaAjuda[] {
  const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return PERGUNTAS_AJUDA;

  const pontuadas = PERGUNTAS_AJUDA.map((item) => {
    const alvo = normalizar([item.pergunta, item.resposta, item.categoria, ...(item.palavrasChave ?? [])].join(" "));
    const pontos = termos.reduce((soma, termo) => soma + (alvo.includes(termo) ? 1 : 0), 0);
    return { item, pontos };
  }).filter((resultado) => resultado.pontos > 0);

  pontuadas.sort((a, b) => b.pontos - a.pontos);
  return pontuadas.map((resultado) => resultado.item);
}
