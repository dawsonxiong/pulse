import type { FeedSource, FeedStory } from "./types";

export const SHORT_URL_HOSTS = new Set([
  "postgr.es",
  "t.co",
  "bit.ly",
  "ow.ly",
  "buff.ly",
  "tinyurl.com",
]);

export function hostnameFromUrl(url: string): string | null {
  try {
    let host = new URL(url).hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    if (host.startsWith("m.")) host = host.slice(2);
    if (host.startsWith("mobile.")) host = host.slice(7);
    return host || null;
  } catch {
    return null;
  }
}

export function isShortUrlHost(host: string | null): boolean {
  return host !== null && SHORT_URL_HOSTS.has(host);
}

/** When a planet/aggregator feed item links off-site, label the originating host. */
export function displaySource(postUrl: string, source: FeedSource): FeedSource {
  const postHost = hostnameFromUrl(postUrl);
  const feedHost = hostnameFromUrl(source.siteUrl);
  if (!postHost || !feedHost || postHost === feedHost || isShortUrlHost(postHost)) return source;
  return {
    id: `origin:${postHost}`,
    name: postHost,
    siteUrl: `https://${postHost}`,
    iconUrl: null,
  };
}

export function decorateFeedStory(story: FeedStory): FeedStory {
  const posts = story.posts.map((post) => ({
    ...post,
    source: displaySource(post.url, post.source),
  }));
  const representative = {
    ...story.representative,
    source: displaySource(story.representative.url, story.representative.source),
  };
  return { ...story, posts, representative };
}
