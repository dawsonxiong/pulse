import type { FeedPost, FeedStory } from "./types";

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201D",
  ldquo: "\u201C",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
};

function fromCodePoint(code: number): string | null {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return null;
  if (code >= 0xd800 && code <= 0xdfff) return null;
  return String.fromCodePoint(code);
}

function decodeOnce(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      return fromCodePoint(Number.parseInt(lower.slice(2), 16)) ?? match;
    }
    if (lower.startsWith("#")) {
      return fromCodePoint(Number.parseInt(lower.slice(1), 10)) ?? match;
    }
    return NAMED[lower] ?? match;
  });
}

/** Decode HTML entities in RSS/Atom text. Does not rewrite wording. */
export function decodeHtmlEntities(value: string): string {
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    const next = decodeOnce(current);
    if (next === current) return next;
    current = next;
  }
  return current;
}

export function decodeFeedPost(post: FeedPost): FeedPost {
  return {
    ...post,
    title: decodeHtmlEntities(post.title),
    author: post.author ? decodeHtmlEntities(post.author) : null,
    excerpt: post.excerpt ? decodeHtmlEntities(post.excerpt) : null,
  };
}

export function decodeFeedStory(story: FeedStory): FeedStory {
  return {
    ...story,
    representative: decodeFeedPost(story.representative),
    posts: story.posts.map(decodeFeedPost),
  };
}
