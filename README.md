# GitGHC — Conferência de Publicações e Prazos

MVP para triagem automática de publicações do diário oficial e cálculo assistido de
prazos processuais. O sistema **propõe** o prazo; a confirmação humana é sempre
obrigatória e auditada. Veja `CLAUDE.md` para as convenções e princípios do projeto.

## Status

**Fase 1 — Fundação e modelo de dados** concluída: schema Prisma, migration inicial e
seed (escritório/usuário demo + calendário forense nacional de 2026).

## Como rodar

```bash
npm install
cp .env.example .env   # preencher DATABASE_URL (Postgres/Supabase) e credenciais Supabase
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Stack

Next.js 14 (App Router) · TypeScript · Prisma · Supabase/PostgreSQL · Tailwind · Zod ·
deploy Vercel.

## Módulo nutrição — MVP "Trilha A" (demo separado)

Além do sistema jurídico acima, este repositório também hospeda um segundo produto,
independente: um demo para validar a tese de acompanhamento nutricional com
nutricionistas (nutricionista cadastra paciente e metas; paciente registra refeição por
texto; painel de aderência). É um demo de descoberta, não o produto final — ver o brief
completo na tarefa que o originou.

- Rotas: `/nutri/login` (signup/login do nutricionista, self-service), `/nutri` (painel,
  protegido), `/p/[token]` (página do paciente, sem senha)
- Código: `src/lib/nutri/*` (lógica de domínio) e `src/app/nutri/*`
- Modelos Prisma: `Nutricionista`, `Paciente`, `RegistroRefeicao` (mesmo banco/projeto
  Supabase do sistema jurídico, sem nenhuma relação entre os dois domínios)
- **Estimativa de macros por IA**: a IA (Anthropic) extrai itens e macros a partir do
  texto/transcrição do paciente. Isso é uma **estimativa**, rotulada como tal na
  interface. Para produção, isso precisa ser ancorado nas tabelas TACO/TBCA + uma base de
  industrializados — o LLM sozinho erra macro de marmita, PF, açaí. No demo a estimativa
  serve; em produção não.
- **Registro por áudio**: transcrição via Web Speech API do navegador (`src/components/
  nutri/useReconhecimentoDeFala.ts`) — a abordagem mais simples possível, sem provedor de
  STT novo fora do stack combinado. Funciona bem em Chrome/Android; suporte é limitado ou
  ausente em boa parte do Safari/iOS (o botão de gravação some quando o navegador não
  suporta, cai para texto). Para produção isso merece um serviço de STT dedicado. Uma vez
  transcrito, o áudio entra pelo mesmo caminho do texto — mesmo contrato de IA, mesma
  idempotência por `clientLogId`, só o campo `origem` muda para `AUDIO`.
- Auth: mesmo projeto Supabase Auth do sistema jurídico (`Nutricionista.authUserId`
  aponta pro mesmo `auth.users`), mas com cadastro self-service (diferente do `/login`
  jurídico, que é só por admin) — o nutricionista é o cliente direto do produto.
- Não-negociáveis do domínio: o app nunca prescreve (metas sempre vêm do
  nutricionista); sem consentimento LGPD (`consentimentoEm`) o paciente não registra
  nada; registro de refeição é idempotente por `clienteRegistroId`.
- **Identidade visual**: logo verde própria (`src/components/nutri/NoSheipeLogo.tsx`,
  ícones em `public/icons/`), com uma paleta (`--color-sheipe`) separada do ciano do
  sistema jurídico (`--color-brass`) — trocar uma não afeta a outra. Na tela usada no
  computador (onde se prescreve/acompanha), o rótulo é neutro ("Painel profissional"),
  sem usar a palavra "nutricionista" nem "personal" no texto da interface.
- **Tema claro/escuro**: segue a preferência do sistema por padrão; o botão flutuante
  (`src/components/nutri/ThemeToggle.tsx`) deixa escolher manualmente, salvo em
  `localStorage` e aplicado antes do primeiro paint (sem flash). Overrides de tema vivem
  em `globals.css` como `:root[data-theme="light"|"dark"]`, aditivos — não mudam o
  comportamento do sistema jurídico.
- **PWA do paciente**: cada paciente tem um manifesto próprio
  (`/p/[token]/manifest.json`), então instalar na tela inicial abre direto no link
  daquele paciente, não num app genérico.
