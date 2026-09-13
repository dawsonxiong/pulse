import { XMLParser } from "fast-xml-parser";

export type ParsedFeedItem = {
  url: string;
  title: string;
  author: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => ["item", "entry", "link", "enclosure"].includes(name),
});

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return asText(value[0]);
  if (value && typeof value === "object" && "#text" in value) {
    const text = (value as { "#text"?: unknown })["#text"];
    if (typeof text === "string") return text.trim() || null;
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function stripHtml(value: string | null): string | null {
  if (!value) return null;
  const text = decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text.slice(0, 400) : null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function linkHref(links: unknown, fallback?: string | null): string | null {
  if (typeof links === "string") return links;
  if (!Array.isArray(links)) return fallback ?? null;
  for (const link of links) {
    if (typeof link === "string" && link.length > 0) return link;
    if (!link || typeof link !== "object") continue;
    const rel = (link as { "@_rel"?: string })["@_rel"];
    if (rel && rel !== "alternate") continue;
    const href =
      (link as { "@_href"?: string; "#text"?: string })["@_href"] ??
      (link as { "#text"?: string })["#text"];
    if (typeof href === "string" && href.length > 0) return href;
  }
  return fallback ?? null;
}

function attrUrl(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return attrUrl(value[0]);
  if (typeof value === "string")
    return value.startsWith("http") || value.startsWith("//") ? value : null;
  if (typeof value !== "object") return null;
  const record = value as { "@_url"?: string; "@_href"?: string };
  return record["@_url"] ?? record["@_href"] ?? null;
}

function isImagePath(url: string): boolean {
  try {
    const path = new URL(url, "https://example.com").pathname.toLowerCase();
    return /\.(avif|gif|jpe?g|png|webp)$/.test(path);
  } catch {
    return /\.(avif|gif|jpe?g|png|webp)(\?|$)/i.test(url);
  }
}

function usableImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = decodeEntities(raw.trim());
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return null;
  if (lower.includes("1x1") || lower.includes("pixel.gif") || lower.includes("/spacer")) {
    return null;
  }
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return null;
}

function imageFromHtml(html: string | null): string | null {
  if (!html) return null;
  const decoded = decodeEntities(html);
  const img = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  const fromSrc = usableImageUrl(img?.[1]);
  if (fromSrc) return fromSrc;
  const srcset = decoded.match(/<img[^>]+srcset=["']([^"']+)["']/i);
  const firstSrcset = srcset?.[1]?.split(",")[0]?.trim().split(/\s+/)[0];
  return usableImageUrl(firstSrcset);
}

function collectMarkup(value: unknown, depth = 0): string {
  if (depth > 8 || value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map((entry) => collectMarkup(entry, depth + 1)).join(" ");
  if (typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const src = record["@_src"];
  const parts: string[] = [];
  if (typeof src === "string" && src.length > 0) {
    parts.push(`<img src="${src}" />`);
  }
  for (const [key, nested] of Object.entries(record)) {
    if (key.startsWith("@_")) continue;
    parts.push(collectMarkup(nested, depth + 1));
  }
  return parts.join(" ");
}

function enclosureUrl(item: Record<string, unknown>): string | null {
  const raw = item.enclosure;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { "@_url"?: string; "@_type"?: string };
    const url = record["@_url"];
    const type = record["@_type"] ?? "";
    if (typeof url === "string" && (type.startsWith("image/") || isImagePath(url))) {
      return url;
    }
  }
  return null;
}

function enclosureLink(links: unknown): string | null {
  if (!Array.isArray(links)) return null;
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const rel = (link as { "@_rel"?: string })["@_rel"];
    const type = (link as { "@_type"?: string })["@_type"] ?? "";
    const href = (link as { "@_href"?: string })["@_href"];
    if (
      rel === "enclosure" &&
      typeof href === "string" &&
      (type.startsWith("image/") || isImagePath(href))
    ) {
      return href;
    }
  }
  return null;
}

function imageElement(value: unknown): string | null {
  if (typeof value === "string") return usableImageUrl(value);
  if (!value || typeof value !== "object") return null;
  const record = value as { url?: unknown; "@_url"?: string; "#text"?: unknown };
  return usableImageUrl(asText(record.url) ?? record["@_url"] ?? asText(record["#text"]));
}

function imageFromItem(item: Record<string, unknown>): string | null {
  const mediaGroup = item["media:group"];
  const group =
    mediaGroup && typeof mediaGroup === "object" ? (mediaGroup as Record<string, unknown>) : null;

  return (
    enclosureUrl(item) ??
    enclosureLink(item.link) ??
    attrUrl(item["media:thumbnail"]) ??
    attrUrl(item["media:content"]) ??
    (group ? (attrUrl(group["media:thumbnail"]) ?? attrUrl(group["media:content"])) : null) ??
    attrUrl(item["itunes:image"]) ??
    imageElement(item.image) ??
    imageFromHtml(asText(item["content:encoded"])) ??
    imageFromHtml(asText(item.content)) ??
    imageFromHtml(asText(item.description)) ??
    imageFromHtml(asText(item.summary)) ??
    imageFromHtml(collectMarkup(item["content:encoded"])) ??
    imageFromHtml(collectMarkup(item.content))
  );
}

export function ogImageFromHtml(html: string): string | null {
  const slice = html.slice(0, 200_000);
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = slice.match(pattern);
    const url = usableImageUrl(match?.[1]);
    if (url) return url;
  }
  return null;
}

export function parseFeedXml(xml: string): ParsedFeedItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rssChannel = (doc.rss as { channel?: Record<string, unknown> } | undefined)?.channel;
  const atomFeed = doc.feed as Record<string, unknown> | undefined;
  const rdf = doc["rdf:RDF"] as { item?: unknown } | undefined;

  const items = (rssChannel?.item ?? rdf?.item ?? atomFeed?.entry ?? []) as unknown[];
  const parsed: ParsedFeedItem[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const title = asText(item.title);
    const url =
      linkHref(item.link, asText(item.link) ?? asText(item.guid) ?? asText(item.id)) ??
      asText(item.id);
    if (!title || !url) continue;

    const author =
      asText(item["dc:creator"]) ??
      asText((item.author as { name?: unknown } | undefined)?.name) ??
      asText(item.author);

    const excerpt = stripHtml(
      asText(item.description) ?? asText(item.summary) ?? asText(item["content:encoded"]),
    );

    const publishedAt = parseDate(
      asText(item.pubDate) ??
        asText(item.published) ??
        asText(item.updated) ??
        asText(item["dc:date"]),
    );

    parsed.push({ url, title, author, excerpt, imageUrl: imageFromItem(item), publishedAt });
  }

  return parsed;
}
