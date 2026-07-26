# GitGHC — Convenções do Projeto (GHC)

Sistema de conferência de publicações e prazos processuais para escritório de advocacia.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** como ORM
- **Supabase/PostgreSQL** como banco e auth
- **Tailwind CSS** para estilos
- **Zod** para validação
- Deploy: **Vercel**

## Regras obrigatórias

- **Nada de `any`.** Tipar tudo explicitamente; usar `unknown` + narrowing quando o tipo de entrada for incerto.
- **Validação de entrada com Zod em toda rota** (route handlers e server actions). Nunca confiar em `request.json()`/`FormData` sem parse de schema.
- **Datas sempre em `America/Sao_Paulo`.** Nunca usar o timezone do servidor/UTC implícito para exibir ou calcular datas voltadas ao usuário.
- Preferir funções puras para lógica de negócio (especialmente cálculo de prazo) — fáceis de testar, sem I/O.
- Nenhuma exclusão física de dados de negócio (`Publicacao`, `Prazo`, etc.) — tudo é mudança de status com auditoria.

## Princípios de domínio (não podem ser violados)

1. **O sistema propõe, o advogado confirma.** Prazos nascem `PENDENTE_CONFIRMACAO`; só viram `CONFIRMADO` por ação humana explícita, com autor e timestamp.
2. **Auditoria imutável** em toda confirmação/alteração de prazo (usuário, timestamp, valor anterior, valor novo).
3. **Nunca inventar data.** Falta de dado seguro (feriado desconhecido, ato não mapeado) → fila de revisão manual com motivo. Nunca chutar.
4. **Idempotência na ingestão.** Reprocessar o mesmo período não duplica publicação (chave única por hash do conteúdo + identificador).

## Estrutura

- `prisma/schema.prisma` — modelo de dados
- `prisma/seed.ts` — dados iniciais (escritório demo, feriados nacionais)
- `src/app` — rotas Next.js (App Router)
- `src/lib` — lógica de domínio (cálculo de prazo, providers de publicação, etc.)

## Como rodar

```bash
npm install
cp .env.example .env   # preencher DATABASE_URL / Supabase
npx prisma migrate dev
npx prisma db seed
npm run dev
```
