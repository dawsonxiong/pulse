import { prisma } from "@pulse/db";
import {
  decodeHtmlEntities,
  rankStories,
  scoreStory,
  usableStoryImage,
  type FeedPost,
  type FeedStory,
  type RankableStory,
} from "@pulse/shared";

const PAGE_SIZE = 20;
const FEED_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type StoryRow = {
  id: string;
  publishedAt: Date;
  sourceCount: number;
  representativePost: PostRow;
  storyPosts: { post: PostRow }[];
};

type PostRow = {
  id: string;
  url: string;
  title: string;
  author: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  source: {
    id: string;
    name: string;
    siteUrl: string;
    iconUrl: string | null;
    authorityScore: number;
  };
  postTags: { tagSlug: string }[];
};

const postInclude = {
  source: true,
  postTags: true,
} as const;

const rankingSelect = {
  id: true,
  publishedAt: true,
  sourceCount: true,
  representativePost: {
    select: {
      source: { select: { authorityScore: true } },
      postTags: { select: { tagSlug: true } },
    },
  },
  storyPosts: {
    select: {
      post: {
        select: {
          source: { select: { authorityScore: true } },
          postTags: { select: { tagSlug: true } },
        },
      },
    },
  },
} as const;

type RankableRow = {
  representativePost: { source: { authorityScore: number }; postTags: { tagSlug: string }[] };
  storyPosts: { post: { source: { authorityScore: number }; postTags: { tagSlug: string }[] } }[];
};

function toFeedPost(post: PostRow): FeedPost {
  return {
    id: post.id,
    url: post.url,
    title: decodeHtmlEntities(post.title),
    author: post.author ? decodeHtmlEntities(post.author) : null,
    excerpt: post.excerpt ? decodeHtmlEntities(post.excerpt) : null,
    imageUrl: usableStoryImage(post.imageUrl),
    publishedAt: post.publishedAt.toISOString(),
    source: {
      id: post.source.id,
      name: post.source.name,
      siteUrl: post.source.siteUrl,
      iconUrl: post.source.iconUrl,
    },
  };
}

function storyTags(row: RankableRow): string[] {
  const slugs = new Set<string>();
  for (const tag of row.representativePost.postTags) slugs.add(tag.tagSlug);
  for (const { post } of row.storyPosts) {
    for (const tag of post.postTags) slugs.add(tag.tagSlug);
  }
  return [...slugs];
}

function sourceAuthority(row: RankableRow): number {
  let max = row.representativePost.source.authorityScore;
  for (const { post } of row.storyPosts) {
    max = Math.max(max, post.source.authorityScore);
  }
  return max;
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      offset?: unknown;
    };
    return typeof parsed.offset === "number" && parsed.offset >= 0 ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

export async function listFeed(options: {
  tags: string[];
  cursor: string | null;
  now?: Date;
}): Promise<{ stories: FeedStory[]; nextCursor: string | null }> {
  const now = options.now ?? new Date();
  const offset = decodeCursor(options.cursor);
  const since = new Date(now.getTime() - FEED_WINDOW_MS);

  const lightRows = await prisma.story.findMany({
    where: { publishedAt: { gte: since } },
    select: rankingSelect,
  });

  const rankable: (RankableStory & { id: string })[] = lightRows.map((row) => ({
    id: row.id,
    publishedAt: row.publishedAt,
    tags: storyTags(row),
    sourceAuthority: sourceAuthority(row),
    upvotes: 0,
  }));

  const ranked = rankStories(rankable, options.tags, now);
  const page = ranked.slice(offset, offset + PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  const nextCursor = nextOffset < ranked.length ? encodeCursor(nextOffset) : null;
  const pageIds = page.map((item) => item.id);

  if (pageIds.length === 0) return { stories: [], nextCursor };

  const fullRows = (await prisma.story.findMany({
    where: { id: { in: pageIds } },
    include: {
      representativePost: { include: postInclude },
      storyPosts: { include: { post: { include: postInclude } } },
    },
  })) as StoryRow[];
  const byId = new Map(fullRows.map((row) => [row.id, row]));

  const stories: FeedStory[] = page.flatMap((item) => {
    const row = byId.get(item.id);
    if (!row) return [];
    const posts = row.storyPosts.map(({ post }) => toFeedPost(post));
    const representative = toFeedPost(row.representativePost);
    if (!posts.some((post) => post.id === representative.id)) {
      posts.unshift(representative);
    }
    return [
      {
        id: row.id,
        publishedAt: row.publishedAt.toISOString(),
        sourceCount: row.sourceCount,
        sourceAuthority: item.sourceAuthority,
        tags: item.tags,
        score: scoreStory(item, options.tags, now),
        representative,
        posts,
      },
    ];
  });

  return { stories, nextCursor };
}
