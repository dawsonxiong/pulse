# Pulse

A Chrome extension that replaces the new tab with a high-signal developer news feed. Think daily.dev, but much cleaner.

Live at [pulse-kappa-green.vercel.app](https://pulse-kappa-green.vercel.app).

![Pulse new-tab page: a grid of developer news stories with source icon, age, vote and save buttons, a tag sidebar, and For you / Latest, Filter and Search controls](docs/screenshots/feed.webp)

## Features

- A new-tab feed of developer news from about 40 RSS feeds, independent blogs included.
- Duplicate coverage of the same event collapses into one story. Titles are never rewritten.
- Pick languages, tools and topics, and the feed ranks stories by what you follow.
- Open a story for its summary or a reader view of the article, and discuss it in a comment thread.
- Votes and a reading list, with no account: everything lives in `chrome.storage`.

## Screenshots

| Story summary with a comment thread | Picking your tags |
| :-: | :-: |
| <img src="docs/screenshots/story-thread.webp" alt="A Pulse story opened over the feed: title, source and age, Summary and Article tabs, the summary text, and a threaded comments section" width="400"> | <img src="docs/screenshots/edit-tags.webp" alt="Pulse's Edit tags page: languages, tools and topics as toggle chips, with TypeScript, Rust, Go, React, Next.js and Databases selected" width="400"> |

## How it works

- A daily cron pulls the feeds and clusters duplicate coverage by canonical URL and title similarity within a 48-hour window.
- The feed API ranks stories by recency, tag match and source authority.
- The extension only asks for `storage` and the API host. No content scripts, no `tabs`.

## Stack

Next.js 16, React 19, TypeScript, Prisma 7, Supabase Postgres, Upstash Redis, WXT, Chrome Manifest V3, Tailwind v4, shadcn/ui, Turborepo. Hosted on Vercel.

## Running locally

Requires Node 22, pnpm and a Postgres database. `.env.example` lists the variables; secrets come from 1Password through `.env.op`.

```sh
pnpm install
op run --account my.1password.com --env-file=.env.op -- pnpm db:migrate
op run --account my.1password.com --env-file=.env.op -- pnpm db:seed
op run --account my.1password.com --env-file=.env.op -- pnpm --filter @pulse/web dev
```

Then build the extension:

```sh
pnpm --filter @pulse/extension build
```

Open `chrome://extensions`, turn on Developer mode, choose Load unpacked and pick `apps/extension/dist/chrome-mv3`. The build talks to the production API; set `WXT_API_URL` to point it at your local one.

Other scripts: `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm typecheck`.

## Structure

- `apps/web/`: landing page, feed API and ingest cron.
- `apps/extension/`: the new-tab extension.
- `packages/shared/`: ranking, clustering and the tag catalog.
- `packages/db/`: Prisma schema and client.
- `packages/ui/`: shared components.
