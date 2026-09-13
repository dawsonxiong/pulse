import { resolveHttpUrl } from "@pulse/shared";

const ICON_REL = /apple-touch-icon|icon/i;

function attr(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function relScore(rel: string, sizes: string | null, href: string): number {
  const lower = rel.toLowerCase();
  let score = 0;
  if (lower.includes("apple-touch-icon")) score += 200;
  else if (/\bicon\b/.test(lower)) score += 100;
  const sizeMatch = sizes?.match(/(\d+)/);
  if (sizeMatch) score += Number(sizeMatch[1]);
  if (/\.svg(\?|$)/i.test(href)) score += 20;
  if (/\.png(\?|$)/i.test(href)) score += 15;
  if (/\.ico(\?|$)/i.test(href)) score += 5;
  return score;
}

export function iconCandidatesFromHtml(html: string, pageUrl: string): string[] {
  const ranked: { href: string; score: number }[] = [];
  const tags = html.slice(0, 200_000).match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = attr(tag, "rel");
    const href = attr(tag, "href");
    if (!rel || !href || !ICON_REL.test(rel)) continue;
    const absolute = resolveHttpUrl(href, pageUrl);
    if (!absolute) continue;
    ranked.push({ href: absolute, score: relScore(rel, attr(tag, "sizes"), absolute) });
  }
  ranked.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of ranked) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    urls.push(item.href);
  }
  return urls;
}

export function fallbackIconUrls(siteUrl: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(siteUrl);
  } catch {
    return [];
  }
  const origin = parsed.origin;
  const host = parsed.hostname;
  return [
    `${origin}/apple-touch-icon.png`,
    `${origin}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
  ];
}
