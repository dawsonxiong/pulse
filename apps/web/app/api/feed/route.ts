import { FEED_SORTS, fixtureStories, type FeedResponse } from "@pulse/shared";
import { z } from "zod";
import { json, preflight } from "@/lib/cors";
import { listFeed } from "@/lib/queries/feed";
import { enforce, feedLimiter } from "@/lib/rate-limit";

const querySchema = z.object({
  tags: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
        : [],
    ),
  sort: z.enum(FEED_SORTS).default("for-you"),
  cursor: z.string().optional(),
});

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = await enforce(req, feedLimiter);
  if (limited) return limited;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    tags: url.searchParams.get("tags") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return json(req, { error: "invalid query" }, 400);
  }

  if (!process.env.DATABASE_URL) {
    const stories = fixtureStories();
    const body: FeedResponse = { stories, nextCursor: null };
    return json(req, body);
  }

  try {
    const { stories, nextCursor } = await listFeed({
      tags: parsed.data.tags,
      sort: parsed.data.sort,
      cursor: parsed.data.cursor ?? null,
    });
    const body: FeedResponse = { stories, nextCursor };
    return json(req, body, 200, {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    });
  } catch (err) {
    console.error(err);
    const stories = fixtureStories();
    const body: FeedResponse = { stories, nextCursor: null };
    return json(req, body);
  }
}

export const dynamic = "force-dynamic";
