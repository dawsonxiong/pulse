import { prisma } from "@pulse/db";
import {
  canonicalizeUrl,
  findMatchingStory,
  resolveHttpUrl,
  TAG_BY_SLUG,
  tagsFromTitle,
  type ClusterCandidate,
} from "@pulse/shared";
import { ogImageFromHtml, parseFeedXml } from "./parse-feed";

const FEED_TIMEOUT_MS = 8_000;
const OG_TIMEOUT_MS = 4_000;
const OG_CONCURRENCY = 6;
const MAX_OG_FETCHES = 40;
const GLOBAL_CAP_MS = 50_000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const CLUSTER_WINDOW_MS = 48 * 60 * 60 * 1000;

export type IngestResult = {
  sources: number;
  fetched: number;
  failed: number;
  inserted: number;
  clustered: number;
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: { "User-Agent": "PulseIngest/0.1 (+https://github.com/pulse)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OG_TIMEOUT_MS),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "PulseIngest/0.1 (+https://github.com/pulse)",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;
    return ogImageFromHtml(await response.text());
  } catch {
    return null;
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) return;
      await fn(item);
    }
  }
  const workers = Math.min(concurrency, items.length);
  if (workers === 0) return;
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

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
    include: {
      storyPosts: { include: { post: { include: { source: true } } } },
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

export async function ingestFeeds(now = new Date()): Promise<IngestResult> {
  const started = now.getTime();
  const sources = await prisma.source.findMany({
    where: { active: true },
    include: { sourceTags: true },
    orderBy: { lastFetchedAt: { sort: "asc", nulls: "first" } },
  });

  let fetched = 0;
  let failed = 0;
  let inserted = 0;
  let clustered = 0;
  let ogFetches = 0;

  for (const source of sources) {
    if (Date.now() - started > GLOBAL_CAP_MS) break;

    try {
      const xml = await fetchText(source.rssUrl);
      const items = parseFeedXml(xml);
      fetched += 1;

      const recentStories = await prisma.story.findMany({
        where: { publishedAt: { gte: new Date(now.getTime() - CLUSTER_WINDOW_MS) } },
        include: { representativePost: true },
      });
      const candidates: ClusterCandidate[] = recentStories.map((story) => ({
        storyId: story.id,
        title: story.representativePost.title,
        publishedAt: story.publishedAt,
      }));

      const sourceTagSlugs = source.sourceTags.map((row) => row.tagSlug);

      const pendingOg: { url: string; assign: (imageUrl: string) => void }[] = [];
      const ogTargets: { item: (typeof items)[number]; absolute: string; canonical: string }[] = [];

      for (const item of items) {
        if (item.imageUrl) continue;
        const absolute = resolveHttpUrl(item.url, source.rssUrl) ?? resolveHttpUrl(item.url);
        if (!absolute) continue;
        const canonical = canonicalizeUrl(absolute);
        if (!canonical) continue;
        const publishedAt = item.publishedAt ?? now;
        if (now.getTime() - publishedAt.getTime() > MAX_AGE_MS) continue;
        ogTargets.push({ item, absolute, canonical });
      }

      const alreadyImaged = new Set(
        (
          await prisma.post.findMany({
            where: {
              canonicalUrl: { in: ogTargets.map((row) => row.canonical) },
              imageUrl: { not: null },
            },
            select: { canonicalUrl: true },
          })
        ).map((row) => row.canonicalUrl),
      );

      for (const target of ogTargets) {
        if (alreadyImaged.has(target.canonical)) continue;
        pendingOg.push({
          url: target.absolute,
          assign: (imageUrl) => {
            target.item.imageUrl = imageUrl;
          },
        });
      }

      await mapPool(pendingOg, OG_CONCURRENCY, async (job) => {
        if (ogFetches >= MAX_OG_FETCHES) return;
        if (Date.now() - started > GLOBAL_CAP_MS) return;
        ogFetches += 1;
        const og = await fetchOgImage(job.url);
        const resolved = og ? resolveHttpUrl(og, job.url) : null;
        if (resolved) job.assign(resolved);
      });

      for (const item of items) {
        const absolute = resolveHttpUrl(item.url, source.rssUrl) ?? resolveHttpUrl(item.url);
        if (!absolute) continue;
        const canonical = canonicalizeUrl(absolute);
        if (!canonical) continue;
        const publishedAt = item.publishedAt ?? now;
        if (now.getTime() - publishedAt.getTime() > MAX_AGE_MS) continue;

        const existing = await prisma.post.findUnique({
          where: { canonicalUrl: canonical },
        });
        const imageUrl = item.imageUrl ? resolveHttpUrl(item.imageUrl, source.rssUrl) : null;
        if (existing) {
          if (!existing.imageUrl && imageUrl) {
            await prisma.post.update({ where: { id: existing.id }, data: { imageUrl } });
          }
          continue;
        }

        const titleTags = tagsFromTitle(item.title);
        const tagSlugs = [...new Set([...sourceTagSlugs, ...titleTags])].filter((slug) =>
          TAG_BY_SLUG.has(slug),
        );

        const post = await prisma.post.create({
          data: {
            sourceId: source.id,
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
        });
        inserted += 1;

        const matchId = findMatchingStory(item.title, publishedAt, candidates, now);
        if (matchId) {
          await prisma.storyPost.create({ data: { storyId: matchId, postId: post.id } });
          await refreshStory(matchId);
          clustered += 1;
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
        where: { id: source.id },
        data: { lastFetchedAt: now, lastError: null },
      });
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "unknown ingest error";
      await prisma.source.update({
        where: { id: source.id },
        data: { lastFetchedAt: now, lastError: message.slice(0, 500) },
      });
    }
  }

  return { sources: sources.length, fetched, failed, inserted, clustered };
}
