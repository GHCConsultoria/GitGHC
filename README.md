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
