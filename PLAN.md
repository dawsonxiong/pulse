# Pulse — Build Plan

> **What this is:** A Chrome new-tab feed of engineering posts. Duplicate coverage collapses into one master story card. Original titles stay intact.
>
> **How to use this doc:** Phases are independently executable. Do not skip them. v1 is the Chrome extension + thin Next.js API + curated RSS ingest.

## v1 scope

- Chrome MV3 extension that overrides the new tab
- Onboarding: pick 5+ tags from the catalog
- Personalized feed of master-story cards (original titles, author + source, “N sources” expander)
- Reading list and up/down votes in `chrome.storage.local`
- Instant paint from cache; revalidate in the background
- Curated RSS (~40 sources) polled on a Vercel cron (daily on Hobby; every 15 minutes on Pro)
- Source icons from each origin’s favicon / apple-touch-icon, refreshed daily
- Simple clustering: canonical URL, or title Jaccard ≥ 0.72 with ≥ 2 overlapping tokens in a 48-hour window

**Out of scope for v1:** Squads, DevCards, Clickbait Shield / title rewriting, LLM summaries, pgvector, Rust ingest, GraphQL, Plus paywall, ads, Recruiter, email digest, Firefox/Edge, Chrome Web Store, Better Auth.

## Stack (locked)

| Layer | Choice |
|---|---|
| Monorepo | pnpm + Turborepo |
| Web / API | Next.js 16 App Router, API routes, Vercel |
| Database | Supabase Postgres, Prisma 7 TS client |
| Extension | WXT + React + Tailwind v4 |
| Shared | Pure TypeScript (`@pulse/shared`) |
| Auth | None in v1 (anonymous + chrome.storage) |
| Rate limit | Upstash Redis; cron bearer secret |
| Lint / format | oxlint + oxfmt |
| Tests | Vitest (shared), Playwright (web) |

## Architecture

New tab (cached SPA) → `GET /api/feed?tags=` → ranked `Story` rows with nested original-title posts.

Cron `GET /api/cron/ingest` (bearer) polls RSS, upserts posts on `canonicalUrl`, clusters into stories. Cron `GET /api/cron/icons` (bearer, daily) refreshes `Source.iconUrl` from each site’s own icons.

## Product rules

- Never rewrite titles. Representative headline = original title of the highest-authority (then newest) post in the cluster.
- One card per event. Cluster members keep their own titles in the expander.
- No yellow shield, no paywalled cleanup.
- Independent blogs with RSS are first-class sources.

## Feed ranking

```
score = recencyDecay(publishedAt)   # 36h half-life
      * tagMatch(storyTags, userTags)  # Jaccard; zero overlap still scores 0.15
      * sourceAuthority
      * (1 + log1p(upvotes))
      * downvoteDamp                 # 1 in v1; downvotes toggle and do not hide
```

Pass `now` in. Do not call `Date.now()` inside the scorer.

## Unpacked Chrome load (manual)

Browser tools cannot drive `chrome://extensions`. After `pnpm --filter @pulse/extension build` (or `dev`):

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → `apps/extension/dist/chrome-mv3`
4. Open a new tab
5. Complete onboarding (5+ tags)
6. Confirm: cached feed paints, then live data (or fixture if API is down)
7. Confirm: original titles, cluster expander, bookmark → Reading list, like/dislike toggle (click again to clear)

## Verification

- `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
- Playwright: landing page, `/api/tags`, `/api/feed`, cron without bearer → 401
- Duplicate URL or near-identical titles within 48h → one story
- Titles in API JSON equal the ingested originals
