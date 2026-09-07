# Pulse

Rules for working in this repo. Read `PLAN.md` for the build plan.

## What this is

Pulse — a Chrome MV3 new-tab extension that shows a high-signal developer news feed. Duplicate coverage of the same event collapses into one **master story card**. Original titles are never rewritten.

v1 is anonymous-first: tags, votes, and the reading list live in `chrome.storage.local`.

## Stack — do not swap without asking

Inherits `Developer/CLAUDE.md`. Only what differs or is pinned here:

- Next.js 16.2+, React 19.2+, Prisma 7, Tailwind v4 — web/API on Vercel
- Neon Postgres. `DATABASE_URL` = pooled (runtime); `DIRECT_URL` = direct (migrations only)
- WXT + React for the Chrome extension (`apps/extension`). New tab only — no content scripts
- Turborepo (`apps/web`, `apps/extension`; `packages/shared`, `packages/db`, `packages/ui`)
- shadcn/ui **base-nova** on Base UI primitives in `@pulse/ui`. Do not invent a parallel component set.
- Better Auth is **not** in v1
- Upstash Redis + `@upstash/ratelimit` on public API routes; cron requires `CRON_SECRET`
- Vitest for `packages/shared`; Playwright for `apps/web` landing + API smoke
- Secrets: 1Password vault **`pulse`**, via `op run --account my.1password.com --env-file=.env.op -- <cmd>`

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

## Out of scope for v1

Squads, DevCards, LLM summaries, embeddings, Plus paywall, native ads, Recruiter, email digest, Firefox/Edge, Chrome Web Store listing, account sync.

## Required behavior

- Default to React Server Components in `apps/web`. `'use client'` only for interactivity.
- Data fetching for pages goes through `apps/web/lib/queries/*`.
- Ingest is idempotent: upsert posts on `canonicalUrl`; re-running the cron does not duplicate stories.

## Workflow

- Branch per ticket: `feat/phase-N-short-description`.
- Before pushing: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` must pass.
- When uncertain, ask — especially for ingest, schema, or clustering changes.

## Where to look

- Build plan, phases, unpacked-load checklist → `PLAN.md`
- DB schema → `packages/db/prisma/schema.prisma`
- Ranking / clustering / tag catalog → `packages/shared`
- Design system (Base UI / shadcn nova) → `packages/ui`
- Feed API → `apps/web/app/api/feed/route.ts`
- New tab UI → `apps/extension/entrypoints/newtab/`
