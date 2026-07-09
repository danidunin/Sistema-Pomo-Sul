# POMO SUL

Sistema Integrado de Gestão Operacional do Pomar. Ver [CLAUDE.md](./CLAUDE.md) para os requisitos completos do projeto.

## Stack

Next.js (App Router) + Prisma/PostgreSQL + Auth.js (Credentials) + PWA (Serwist).

## Desenvolvimento

```bash
npm install
npx prisma migrate dev   # aplica o schema no banco local
npx prisma db seed       # cria tipos de atividade e usuário inicial
npm run dev              # http://localhost:3000
```

Configure a `DATABASE_URL` em `.env` antes de rodar as migrations (ver `.env.example` implícito no `prisma/schema.prisma`).

Usuário semente padrão: `admin@pomosul.com.br` / `pomosul123` (personalizável via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA`).

## Build de produção

```bash
npm run build
npm run start
```
