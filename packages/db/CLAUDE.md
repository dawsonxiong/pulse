# @pulse/db

Prisma 7 schema and client. Runtime queries use `DATABASE_URL` (pooled) via `@prisma/adapter-pg`. The CLI uses `DIRECT_URL` from `prisma.config.ts`.

Generate the client with `pnpm db:generate`. Apply the committed migration yourself — do not edit `prisma/migrations/20260902120000_init`. Runtime `DATABASE_URL` is the Supabase transaction pooler; `DIRECT_URL` is session/direct for migrate.

Secrets: `op://pulse/Supabase/DATABASE_URL`, `op://pulse/Supabase/DIRECT_URL`. Breaking changes to this contract also update root `CLAUDE.md` and `AGENTS.md`.

`iconUrl` / `iconFetchedAt` are filled by `GET /api/cron/icons`, not by seed.

Seed curated RSS sources: `pnpm db:seed` (requires a live database).
