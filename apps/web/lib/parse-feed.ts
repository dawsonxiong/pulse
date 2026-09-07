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
  isArray: (name) => ["item", "entry", "link"].includes(name),
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

function stripHtml(value: string | null): string | null {
  if (!value) return null;
  const text = value
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
  if (typeof value === "string") return value.startsWith("http") ? value : null;
  if (typeof value !== "object") return null;
  const record = value as { "@_url"?: string; "@_href"?: string };
  return record["@_url"] ?? record["@_href"] ?? null;
}

function imageFromHtml(html: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = match?.[1];
  return src && /^https?:\/\//i.test(src) ? src : null;
}

function imageFromItem(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { "@_url"?: string; "@_type"?: string } | undefined;
  if (enclosure?.["@_type"]?.startsWith("image/") && enclosure["@_url"]) {
    return enclosure["@_url"];
  }
  return (
    attrUrl(item["media:thumbnail"]) ??
    attrUrl(item["media:content"]) ??
    attrUrl(item["itunes:image"]) ??
    imageFromHtml(asText(item["content:encoded"]) ?? asText(item.description))
  );
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
