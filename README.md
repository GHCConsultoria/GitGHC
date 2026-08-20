# Zelo — Conferência de Publicações e Prazos

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
- **Banco separado (Turso/libSQL)**: `Nutricionista`, `Paciente`, `RegistroRefeicao` moram
  num schema Prisma próprio (`prisma/nutri/schema.prisma`, client em
  `src/lib/nutri/prisma.ts`) rodando no **Turso**, não no Postgres/Supabase do sistema
  jurídico — os dois bancos são independentes, sem nenhuma relação entre os domínios.
  SQLite/Turso não tem enum nativo, então `status`/`origem` são `String` com os valores
  válidos documentados em `src/lib/nutri/schemas.ts`; o mesmo vale pro campo `itens`, que
  vira JSON serializado manualmente (SQLite também não tem o tipo `Json` do Prisma).
  Setup:
  ```bash
  # criar o banco (Turso CLI: https://docs.turso.tech/cli/installation)
  turso db create nosheipe
  turso db show nosheipe --url        # -> TURSO_DATABASE_URL
  turso db tokens create nosheipe     # -> TURSO_AUTH_TOKEN
  # aplicar o schema e semear o nutricionista demo
  npm run db:push:nutri
  npm run db:seed:nutri
  ```
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
- Auth: mesmo projeto **Supabase Auth** do sistema jurídico (`Nutricionista.authUserId`
  aponta pro mesmo `auth.users`) — usado só como serviço de autenticação (GoTrue),
  independente de onde os dados da aplicação ficam guardados (Turso). Cadastro
  self-service (diferente do `/login` jurídico, que é só por admin) — o nutricionista é o
  cliente direto do produto.
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

## Módulo imobiliária — SaaS de gestão (produto separado)

Terceiro produto do repositório: um SaaS **multi-tenant** de gestão para imobiliárias
(imóveis, proprietários, clientes, CRM/leads, visitas, propostas, vendas, locações,
contratos, financeiro, comissões, relatórios). Segue o mesmo padrão de vertical isolado
do NoSheipe: schema Prisma próprio, namespace de rotas e de domínio, reaproveitando o
Supabase Auth e o Tailwind do repositório — sem introduzir Auth.js/shadcn/RHF.

- **Rotas**: `/imob/login` (login + cadastro self-service da imobiliária), `/imob`
  (painel protegido), `/imob/onboarding` (wizard da conta nova), `/imob/usuarios`,
  `/imob/papeis`, `/imob/configuracoes`, `/imob/auditoria`.
- **Código**: `src/lib/imob/*` (domínio: `rbac.ts`, `auth.ts`, `acoes.ts`, `consultas.ts`,
  `schemas.ts`, `auditoria.ts`, `provisionamento.ts`, `navegacao.ts`) e `src/app/imob/*`
  (rotas), com componentes em `src/components/imob/*`.
- **Banco Postgres dedicado**: schema próprio em `prisma/imob/schema.prisma` (client
  gerado em `prisma/imob/generated`, ver `src/lib/imob/prisma.ts`), **separado** do
  Postgres do sistema jurídico e do Turso do NoSheipe. Variáveis `IMOB_DATABASE_URL` /
  `IMOB_DIRECT_URL`. Setup:
  ```bash
  # apontar IMOB_DATABASE_URL / IMOB_DIRECT_URL no .env para um Postgres dedicado
  npm run db:migrate:imob   # cria/aplica as migrations em dev
  npm run db:seed:imob      # imobiliária demo + papéis padrão + equipe demo
  ```
  Em produção o build roda `prisma migrate deploy` + seed do imob automaticamente quando
  `IMOB_DIRECT_URL` está setado (senão pula, sem quebrar os outros produtos).
- **Multi-tenancy**: toda entidade de negócio tem `imobiliariaId`; o isolamento é
  garantido **no servidor** — as funções de `src/lib/imob/consultas.ts` sempre filtram
  por tenant, e as `acoes.ts` só operam sobre registros do tenant da sessão
  (`obterUsuarioDoTenant`/`obterPapelDoTenant`). Nunca confiar só no front.
- **RBAC granular**: catálogo único de permissões (`imoveis.criar`, `financeiro.ver`, …)
  em `src/lib/imob/rbac.ts`, papéis embutidos por tenant (Administrador/Gestor/Corretor/
  Financeiro/Assistente) e papéis customizáveis pelo admin. A autorização mora no servidor
  (`exigirPermissao`); a navegação e os botões só refletem o que o servidor já checou.
- **Auditoria imutável** (`imob_logs_auditoria`): toda criação/edição relevante grava
  antes/depois em JSON, dentro da mesma transação da mudança. Sem exclusão física —
  usuário/papel mudam de status, não somem.
- **Auth**: mesmo Supabase Auth (GoTrue) dos outros produtos; `UsuarioImob.authUserId`
  aponta pro mesmo `auth.users`. Cadastro self-service cria tenant + papéis padrão +
  primeiro Administrador numa transação, com rollback do usuário Auth se algo falhar.
- **Status — Fases 1 e 2 concluídas.**
  - Fase 1: arquitetura, banco, autenticação, multi-tenancy, usuários, papéis/permissões,
    onboarding e auditoria.
  - Fase 2: imóveis (CRUD completo com fotos, filtros, busca e paginação), proprietários,
    clientes (com preferências de busca) e dashboard com KPIs reais. Valores monetários em
    centavos; fotos por URL via abstração de storage (`src/lib/imob/storage.ts`), pronta
    para upload de binário no Supabase Storage. Seed com 15 proprietários, 20 clientes e
    30 imóveis fictícios.
  - Próximas fases (cada uma com banco, validação e autorização reais): CRM/leads/visitas/
    agenda/tarefas → propostas/vendas/locações/contratos → financeiro/comissões →
    documentos/notificações/relatórios.
