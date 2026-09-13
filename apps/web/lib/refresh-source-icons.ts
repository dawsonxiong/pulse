import { prisma } from "@pulse/db";
import { fallbackIconUrls, iconCandidatesFromHtml } from "./parse-icon";

const PAGE_TIMEOUT_MS = 8_000;
const HEAD_TIMEOUT_MS = 2_500;
const CONCURRENCY = 8;
const USER_AGENT = "PulseIngest/0.1 (+https://github.com/pulse)";

export type IconRefreshResult = {
  sources: number;
  updated: number;
  failed: number;
};

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

function isImageContentType(value: string | null): boolean {
  if (!value) return false;
  const type = value.toLowerCase();
  return type.startsWith("image/") || type.includes("icon") || type.includes("svg");
}

async function isUsableIcon(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: "image/*,*/*;q=0.8" },
    });
    if (!response.ok) return false;
    if (isImageContentType(response.headers.get("content-type"))) return true;
    return url.includes("google.com/s2/favicons");
  } catch {
    return false;
  }
}

async function firstUsableIcon(urls: string[]): Promise<string | null> {
  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    if (url.includes("google.com/s2/favicons")) return url;
    if (await isUsableIcon(url)) return url;
  }
  return null;
}

async function discoverIcon(siteUrl: string): Promise<string | null> {
  const fallbacks = fallbackIconUrls(siteUrl);
  try {
    const page = await fetch(siteUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
    });
    if (page.ok) {
      const html = await page.text();
      const fromPage = iconCandidatesFromHtml(html, page.url || siteUrl).slice(0, 2);
      const found = await firstUsableIcon([...fromPage, ...fallbacks]);
      if (found) return found;
    }
  } catch {
    // fall through to origin/Google fallbacks
  }
  return firstUsableIcon(fallbacks);
}

export async function refreshSourceIcons(now = new Date()): Promise<IconRefreshResult> {
  const sources = await prisma.source.findMany({
    where: { active: true },
    select: { id: true, siteUrl: true },
  });

  let updated = 0;
  let failed = 0;

  await mapPool(sources, CONCURRENCY, async (source) => {
    try {
      const iconUrl = await discoverIcon(source.siteUrl);
      await prisma.source.update({
        where: { id: source.id },
        data: { iconUrl, iconFetchedAt: now },
      });
      if (iconUrl) updated += 1;
      else failed += 1;
    } catch {
      failed += 1;
      await prisma.source.update({
        where: { id: source.id },
        data: { iconFetchedAt: now },
      });
    }
  });

  return { sources: sources.length, updated, failed };
}
