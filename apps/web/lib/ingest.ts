import { prisma } from "@pulse/db";
import {
  canonicalizeUrl,
  findMatchingStory,
  hostnameFromUrl,
  isShortUrlHost,
  resolveHttpUrl,
  TAG_BY_SLUG,
  tagsFromTitle,
  usableStoryImage,
} from "@pulse/shared";
import { parseFeedXml } from "./parse-feed";

const FEED_TIMEOUT_MS = 8_000;
const PROCESS_DEADLINE_MS = 55_000;
const FETCH_CONCURRENCY = 8;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const CLUSTER_WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_ITEMS_PER_FEED = 40;

export type IngestError = { slug: string; error: string };

export type IngestResult = {
  sources: number;
  fetched: number;
  failed: number;
  empty: number;
  inserted: number;
  clustered: number;
  skippedOld: number;
  skippedBadUrl: number;
  claimed: number;
  expanded: number;
  timedOut: number;
  errors: IngestError[];
};

type SourceRow = {
  id: string;
  slug: string;
  rssUrl: string;
  siteUrl: string;
  sourceTags: { tagSlug: string }[];
};

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await fn(item);
    }
  }
  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: {
      "User-Agent": "PulseIngest/0.1 (+https://github.com/pulse)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html") && !contentType.includes("xml")) {
    throw new Error(`HTML instead of feed (${contentType})`);
  }
  return response.text();
}

async function followShortUrl(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 5; hop += 1) {
    if (!isShortUrlHost(hostnameFromUrl(current))) return current;
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(4_000),
        headers: { "User-Agent": "PulseIngest/0.1 (+https://github.com/pulse)" },
      });
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) return response.url || current;
      current = resolveHttpUrl(location, current) ?? current;
    } catch {
      return current;
    }
  }
  return current;
}

const postLookupSelect = {
  id: true,
  sourceId: true,
  url: true,
  canonicalUrl: true,
  title: true,
  imageUrl: true,
  source: { select: { id: true, siteUrl: true } },
} as const;

function pickRepresentative(
  posts: {
    id: string;
    publishedAt: Date;
    source: { authorityScore: number };
  }[],
): { id: string; publishedAt: Date } {
  const sorted = [...posts].sort((a, b) => {
    if (b.source.authorityScore !== a.source.authorityScore) {
      return b.source.authorityScore - a.source.authorityScore;
    }
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
  const top = sorted[0];
  if (!top) throw new Error("story has no posts");
  return { id: top.id, publishedAt: top.publishedAt };
}

async function refreshStory(storyId: string): Promise<void> {
  const story = await prisma.story.findUniqueOrThrow({
    where: { id: storyId },
    select: {
      publishedAt: true,
      storyPosts: {
        select: {
          post: {
            select: {
              id: true,
              sourceId: true,
              publishedAt: true,
              source: { select: { authorityScore: true } },
            },
          },
        },
      },
    },
  });
  const posts = story.storyPosts.map((sp) => sp.post);
  const uniqueSources = new Set(posts.map((post) => post.sourceId));
  const representative = pickRepresentative(posts);
  const publishedAt = posts.reduce(
    (max, post) => (post.publishedAt > max ? post.publishedAt : max),
    posts[0]?.publishedAt ?? story.publishedAt,
  );
  await prisma.story.update({
    where: { id: storyId },
    data: {
      representativePostId: representative.id,
      publishedAt,
      sourceCount: uniqueSources.size,
    },
  });
}

type FetchOutcome =
  | { source: SourceRow; ok: true; xml: string }
  | { source: SourceRow; ok: false; error: string };

async function ingestFeeds(now = new Date()): Promise<IngestResult> {
  const started = now.getTime();
  const sources = await prisma.source.findMany({
    where: { active: true },
    include: { sourceTags: true },
    orderBy: { lastFetchedAt: { sort: "asc", nulls: "first" } },
  });

  const result: IngestResult = {
    sources: sources.length,
    fetched: 0,
    failed: 0,
    empty: 0,
    inserted: 0,
    clustered: 0,
    skippedOld: 0,
    skippedBadUrl: 0,
    claimed: 0,
    expanded: 0,
    timedOut: 0,
    errors: [],
  };

  const outcomes = await mapPool(
    sources,
    FETCH_CONCURRENCY,
    async (source): Promise<FetchOutcome> => {
      try {
        const xml = await fetchText(source.rssUrl);
        return { source, ok: true, xml };
      } catch (err) {
        const error = err instanceof Error ? err.message : "unknown ingest error";
        return { source, ok: false, error: error.slice(0, 500) };
      }
    },
  );

  const recentStories = await prisma.story.findMany({
    where: { publishedAt: { gte: new Date(now.getTime() - CLUSTER_WINDOW_MS) } },
    select: {
      id: true,
      publishedAt: true,
      representativePost: { select: { title: true } },
    },
  });
  const candidates = recentStories.map((story) => ({
    storyId: story.id,
    title: story.representativePost.title,
    publishedAt: story.publishedAt,
  }));

  const failures = outcomes.filter(
    (outcome): outcome is Extract<FetchOutcome, { ok: false }> => !outcome.ok,
  );
  const successes = outcomes.filter(
    (outcome): outcome is Extract<FetchOutcome, { ok: true }> => outcome.ok,
  );

  for (const outcome of failures) {
    result.failed += 1;
    result.errors.push({ slug: outcome.source.slug, error: outcome.error });
    await prisma.source.update({
      where: { id: outcome.source.id },
      data: { lastFetchedAt: now, lastError: outcome.error },
    });
  }

  for (const outcome of successes) {
    if (Date.now() - started > PROCESS_DEADLINE_MS) {
      result.timedOut += 1;
      continue;
    }

    try {
      const parsed = parseFeedXml(outcome.xml);
      if (parsed.length === 0) {
        result.empty += 1;
        const error = "parsed 0 items";
        result.errors.push({ slug: outcome.source.slug, error });
        await prisma.source.update({
          where: { id: outcome.source.id },
          data: { lastFetchedAt: now, lastError: error },
        });
        continue;
      }

      result.fetched += 1;
      const items = [...parsed]
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
        .slice(0, MAX_ITEMS_PER_FEED);
      const sourceTagSlugs = outcome.source.sourceTags.map((row) => row.tagSlug);

      for (const item of items) {
        const unresolved =
          resolveHttpUrl(item.url, outcome.source.rssUrl) ?? resolveHttpUrl(item.url);
        if (!unresolved) {
          result.skippedBadUrl += 1;
          continue;
        }
        const followed = await followShortUrl(unresolved);
        const absolute = resolveHttpUrl(followed) ?? unresolved;
        const canonical = canonicalizeUrl(absolute);
        const feedCanonical = canonicalizeUrl(unresolved);
        if (!canonical) {
          result.skippedBadUrl += 1;
          continue;
        }
        const publishedAt = item.publishedAt ?? now;
        if (now.getTime() - publishedAt.getTime() > MAX_AGE_MS) {
          result.skippedOld += 1;
          continue;
        }

        const existing =
          (await prisma.post.findUnique({
            where: { canonicalUrl: canonical },
            select: postLookupSelect,
          })) ??
          (feedCanonical && feedCanonical !== canonical
            ? await prisma.post.findUnique({
                where: { canonicalUrl: feedCanonical },
                select: postLookupSelect,
              })
            : null);
        const imageUrl = usableStoryImage(
          item.imageUrl ? resolveHttpUrl(item.imageUrl, outcome.source.rssUrl) : null,
        );
        if (existing) {
          const data: {
            imageUrl?: string | null;
            title?: string;
            sourceId?: string;
            url?: string;
            canonicalUrl?: string;
          } = {};
          if (existing.imageUrl !== imageUrl) data.imageUrl = imageUrl;
          if (existing.title !== item.title) data.title = item.title;
          if (existing.url !== absolute) {
            data.url = absolute;
            if (
              isShortUrlHost(hostnameFromUrl(existing.url)) &&
              !isShortUrlHost(hostnameFromUrl(absolute))
            ) {
              result.expanded += 1;
            }
          }
          if (existing.canonicalUrl !== canonical) {
            const conflict = await prisma.post.findUnique({
              where: { canonicalUrl: canonical },
              select: { id: true },
            });
            if (!conflict) data.canonicalUrl = canonical;
          }
          const postHost = hostnameFromUrl(data.url ?? existing.url);
          const incomingHost = hostnameFromUrl(outcome.source.siteUrl);
          const currentHost = hostnameFromUrl(existing.source.siteUrl);
          if (
            postHost &&
            incomingHost === postHost &&
            currentHost !== postHost &&
            existing.sourceId !== outcome.source.id
          ) {
            data.sourceId = outcome.source.id;
            result.claimed += 1;
          }
          if (Object.keys(data).length > 0) {
            await prisma.post.update({
              where: { id: existing.id },
              data,
              select: { id: true },
            });
          }
          continue;
        }

        const titleTags = tagsFromTitle(item.title);
        const tagSlugs = [...new Set([...sourceTagSlugs, ...titleTags])].filter((slug) =>
          TAG_BY_SLUG.has(slug),
        );

        const post = await prisma.post.create({
          data: {
            sourceId: outcome.source.id,
            url: absolute,
            canonicalUrl: canonical,
            title: item.title,
            author: item.author,
            excerpt: item.excerpt,
            imageUrl,
            publishedAt,
            postTags: {
              create: tagSlugs.map((tagSlug) => ({ tagSlug })),
            },
          },
          select: { id: true },
        });
        result.inserted += 1;

        const matchId = findMatchingStory(item.title, publishedAt, candidates, now);
        if (matchId) {
          await prisma.storyPost.create({ data: { storyId: matchId, postId: post.id } });
          await refreshStory(matchId);
          result.clustered += 1;
        } else {
          const story = await prisma.story.create({
            data: {
              representativePostId: post.id,
              publishedAt,
              sourceCount: 1,
              storyPosts: { create: { postId: post.id } },
            },
          });
          candidates.push({
            storyId: story.id,
            title: item.title,
            publishedAt,
          });
        }
      }

      await prisma.source.update({
        where: { id: outcome.source.id },
        data: { lastFetchedAt: now, lastError: null },
      });
    } catch (err) {
      result.failed += 1;
      const error = (err instanceof Error ? err.message : "unknown ingest error").slice(0, 500);
      result.errors.push({ slug: outcome.source.slug, error });
      await prisma.source.update({
        where: { id: outcome.source.id },
        data: { lastFetchedAt: now, lastError: error },
      });
    }
  }

  return result;
}

export { ingestFeeds };
