<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev`. Commit it so the tree stays clean.

<!-- END:nextjs-agent-rules -->

Repo rules: `../../AGENTS.md` and `../../CLAUDE.md`. Breaking changes update both of those files together.

- API routes over server actions.
- RSC by default. `'use client'` only for interactivity.
- Page data fetching goes through `lib/queries/*`.
- Every public API route calls `enforce` from `lib/rate-limit.ts`. Cron also calls `requireCronSecret`.
