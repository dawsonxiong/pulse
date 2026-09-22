# Pulse

Agent rules for this repo. Product and stack truth lives here. `CLAUDE.md` is a pointer at this file — do not duplicate the body.

## What this is

Pulse — a Chrome MV3 new-tab extension that shows a high-signal developer news feed. Duplicate coverage of the same event collapses into one **master story card**. Original titles are never rewritten.

v1 is anonymous-first: tags, votes, and the reading list live in `chrome.storage.local`.

## Commands

From the repo root. Secrets via `op run --account my.1password.com --env-file=.env.op -- <cmd>`.

| Task | Command |
|---|---|
| Web/API dev | `pnpm --filter @pulse/web dev` (port 3000) |
| Extension build | `pnpm --filter @pulse/extension build` → load `apps/extension/dist/chrome-mv3` (targets production API; set `WXT_API_URL` to override — `wxt` dev uses `localhost:3000`) |
| Extension typecheck | `pnpm --filter @pulse/extension typecheck` |
| Lint / format | `pnpm lint` / `pnpm format` / `pnpm format:check` |
| Typecheck / test | `pnpm typecheck` / `pnpm test` |
| Generate Prisma client | `pnpm db:generate` |
| Migrate (you apply) | `pnpm db:migrate` against `DIRECT_URL` |
| Seed RSS sources | `pnpm db:seed` |
| Refresh source icons | `GET /api/cron/icons` with `Authorization: Bearer $CRON_SECRET` (daily on Vercel) |

## Stack — do not swap without asking

Inherits the `next16-app` house skill. Only what differs or is pinned here:

- Next.js 16.2+, React 19.2+, Prisma 7, Tailwind v4 — web/API on Vercel
- Supabase Postgres (project `pulse`, ref `pfmpmyaislureoqtgjuh`). `DATABASE_URL` = transaction pooler `:6543` with `pgbouncer=true` (runtime); `DIRECT_URL` = session or direct `:5432` (migrations only). No Supabase Auth, RLS-as-authz, or anon-key client in v1.
- WXT + React for the Chrome extension (`apps/extension`). New tab only — no content scripts. Production output is `apps/extension/dist/chrome-mv3` (not `.output`).
- Turborepo (`apps/web`, `apps/extension`; `packages/shared`, `packages/db`, `packages/ui`)
- shadcn/ui **base-nova** on Base UI primitives in `@pulse/ui`. Do not invent a parallel component set.
- Better Auth is **not** in v1
- Upstash Redis + `@upstash/ratelimit` on public API routes when configured; without Upstash, `enforce` no-ops. Cron requires `CRON_SECRET`
- Vitest for `packages/shared`; Playwright for `apps/web` landing + API smoke
- Secrets: 1Password vault **`pulse`**, via `op run --account my.1password.com --env-file=.env.op -- <cmd>`
  - `op://pulse/Supabase/DATABASE_URL`
  - `op://pulse/Supabase/DIRECT_URL`
  - `op://pulse/Supabase/CRON_SECRET`
  - Upstash is optional; do not add `op://` refs until the `Upstash` item exists or `op run` fails

## Hard rules

- **Never rewrite titles.** API responses and the new-tab UI show the author's original headline. No Clickbait Shield, no yellow warning icons, no paywalled cleanup.
- **Stories, not posts, are the feed unit.** Clustering is URL canonicalization + title Jaccard (≥ 0.72 and ≥ 2 overlapping tokens within 48 hours). Not pgvector in v1.
- **Independent blogs with a real RSS URL are first-class sources.** No Squads-only ghetto.
- **API routes over server actions.** Zod-validate at every HTTP boundary.
- **Every public API route goes through `lib/rate-limit.ts`'s `enforce(req, limiter)`.** Cron routes additionally require `requireCronSecret(req)`.
- **CORS allows `chrome-extension://*` and the site origin.** The extension is the primary client.
- **No `<all_urls>`, no `tabs`, no content scripts.** Extension permissions are `storage` + the API host only.
- **`packages/shared` stays pure** — no I/O, no DB, no network, no Chrome APIs. Pass `now` into ranking/clustering.
- **Prisma client is the singleton from `@pulse/db`.** Never instantiate `PrismaClient` ad-hoc.
- **Do not add GraphQL, Fastify, GraphORM, Temporal, or a second host.**
- **Votes toggle.** Clicking the same up/down control again clears it. Downvotes do **not** hide cards.

## Out of scope for v1

Squads, DevCards, LLM summaries, embeddings, Plus paywall, native ads, Recruiter, email digest, Firefox/Edge, Chrome Web Store listing, account sync.

## Required behavior

- Default to React Server Components in `apps/web`. `'use client'` only for interactivity.
- Data fetching for pages goes through `apps/web/lib/queries/*`.
- Ingest is idempotent: upsert posts on `canonicalUrl`; re-running the cron does not duplicate stories.
- Source icons come from each origin (`apple-touch-icon` / `rel=icon` / `favicon.ico`). `GET /api/cron/icons` refreshes them daily.

## Workflow

- Branch per ticket: `feat/phase-N-short-description`.
- Commits: conventional, one line. `type(scope): summary` — no body unless a breaking-change footer is required.
- Before pushing: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` must pass.
- Breaking changes update `AGENTS.md` (and `PLAN.md` when the build plan is wrong).
- When uncertain, ask — especially for ingest, schema, or clustering changes.

## Where to look

- Next.js 16 agent notes (do not treat this as pages-router Next) → `apps/web/AGENTS.md`
- Build plan, phases, unpacked-load checklist → `PLAN.md`
- DB schema → `packages/db/prisma/schema.prisma`
- Ranking / clustering / tag catalog → `packages/shared`
- Design system (Base UI / shadcn nova) → `packages/ui`
- Feed API → `apps/web/app/api/feed/route.ts`
- Source icons cron → `apps/web/app/api/cron/icons/route.ts`
- New tab UI → `apps/extension/entrypoints/newtab/`
