# @pulse/db

Prisma 7 schema and client. Runtime queries use `DATABASE_URL` (pooled) via `@prisma/adapter-pg`. The CLI uses `DIRECT_URL` from `prisma.config.ts`.

Generate the client with `pnpm db:generate`. Apply the committed migration yourself — do not edit `prisma/migrations/20260902120000_init`.

Seed curated RSS sources: `pnpm db:seed` (requires a live database).
