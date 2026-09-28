import { resolveHttpUrl } from "@pulse/shared";

const PLATFORM_ICON_HOST = /(^|\.)medium\.com$|(^|\.)miro\.medium\.com$/i;
const BRAND_LOGO_CLASS = /(?:^|\s)(?:branding__logo|custom-logo|site-logo)(?:\s|$)/;

function attr(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function decodeAttr(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#038;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function unique(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function isIconRel(rel: string): boolean {
  return rel
    .toLowerCase()
    .split(/\s+/)
    .some((token) => token === "icon" || token.startsWith("apple-touch-icon"));
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

function assetKey(url: string): string | null {
  try {
    const file = decodeURIComponent(new URL(url).pathname).split("/").pop() ?? "";
    const base = file.replace(/\.[a-z0-9]+$/i, "");
    return base.length >= 8 ? base : null;
  } catch {
    return null;
  }
}

function collectLogos(value: unknown, into: string[], depth = 0): void {
  if (!value || typeof value !== "object" || depth > 6) return;
  if (Array.isArray(value)) {
    for (const item of value) collectLogos(item, into, depth + 1);
    return;
  }
  const record = value as Record<string, unknown>;
  const logo = record.logo;
  if (typeof logo === "string") into.push(logo);
  else if (
    logo &&
    typeof logo === "object" &&
    typeof (logo as { url?: unknown }).url === "string"
  ) {
    into.push((logo as { url: string }).url);
  }
  if ("@graph" in record) collectLogos(record["@graph"], into, depth + 1);
}

export function iconCandidatesFromHtml(html: string, pageUrl: string): string[] {
  const ranked: { href: string; score: number }[] = [];
  const tags = html.slice(0, 200_000).match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = attr(tag, "rel");
    const href = attr(tag, "href");
    if (!rel || !href || !isIconRel(rel)) continue;
    const absolute = resolveHttpUrl(decodeAttr(href), pageUrl);
    if (!absolute) continue;
    ranked.push({ href: absolute, score: relScore(rel, attr(tag, "sizes"), absolute) });
  }
  ranked.sort((a, b) => b.score - a.score);
  return unique(ranked.map((item) => item.href));
}

/** Square publication marks and header logos, ahead of a host's generic favicon. */
export function publicationIconCandidates(html: string, pageUrl: string): string[] {
  const slice = html.slice(0, 400_000);
  const logos: string[] = [];
  const scripts =
    slice.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const body = script.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      collectLogos(JSON.parse(body), logos);
    } catch {
      // ignore invalid JSON-LD
    }
  }

  const keys = logos.map(assetKey).filter((key): key is string => Boolean(key));
  const squares: { size: number; url: string }[] = [];
  const branding: string[] = [];
  for (const tag of slice.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attr(tag, "src");
    if (!src) continue;
    const absolute = resolveHttpUrl(decodeAttr(src), pageUrl);
    if (!absolute) continue;
    const cls = attr(tag, "class") ?? "";
    if (BRAND_LOGO_CLASS.test(cls)) branding.push(absolute);
    const fill = absolute.match(/resize:fill:(\d+):\1\b/);
    if (!fill || !keys.some((key) => absolute.includes(key))) continue;
    squares.push({ size: Number(fill[1]), url: absolute });
  }
  squares.sort((a, b) => b.size - a.size);

  const resolvedLogos = logos
    .map((url) => resolveHttpUrl(decodeAttr(url), pageUrl))
    .filter((url): url is string => Boolean(url));
  return unique([...squares.map((item) => item.url), ...resolvedLogos, ...branding]);
}

export function iconsArePlatformDefaults(urls: string[]): boolean {
  if (urls.length === 0) return false;
  return urls.every((url) => {
    try {
      return PLATFORM_ICON_HOST.test(new URL(url).hostname);
    } catch {
      return false;
    }
  });
}

export function orderedIconCandidates(html: string, pageUrl: string, siteUrl: string): string[] {
  const fromPage = iconCandidatesFromHtml(html, pageUrl);
  const marks = publicationIconCandidates(html, pageUrl);
  const head = iconsArePlatformDefaults(fromPage)
    ? [...marks, ...fromPage]
    : [...fromPage, ...marks];
  return unique([...head, ...fallbackIconUrls(siteUrl)]);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24)
  );
}

/** True when the bytes are a decodable PNG, JPEG, GIF, WebP, SVG, or ICO. */
export function iconPayloadOk(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  if (
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) ||
    (bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50)
  ) {
    return true;
  }

  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 200))
    .trimStart()
    .toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return true;

  if (bytes[0] !== 0 || bytes[1] !== 0 || bytes[2] !== 1 || bytes[3] !== 0) return false;
  const count = (bytes[4] ?? 0) | ((bytes[5] ?? 0) << 8);
  if (count < 1 || count > 16 || bytes.length < 6 + 16 * count) return false;
  for (let i = 0; i < count; i++) {
    const entry = 6 + 16 * i;
    const size = readU32(bytes, entry + 8);
    const offset = readU32(bytes, entry + 12);
    if (size < 16 || offset < 6 || offset + 8 > bytes.length) return false;
    const png = bytes[offset] === 0x89 && bytes[offset + 1] === 0x50;
    const dib = bytes[offset] === 40;
    if (!png && !dib) return false;
  }
  return true;
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
