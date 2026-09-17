import { SEED_SOURCES } from "../../../packages/db/scripts/sources";
import { parseFeedXml } from "../lib/parse-feed";

const UA = "PulseIngest/0.1 (+https://github.com/pulse)";
const TIMEOUT_MS = 8_000;

type Row = {
  slug: string;
  status: number | "timeout" | "error";
  items: number;
  recent: number;
  sampleHost: string | null;
  error?: string;
};

async function probe(slug: string, rssUrl: string): Promise<Row> {
  const started = Date.now();
  try {
    const response = await fetch(rssUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
      },
      redirect: "follow",
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        slug,
        status: response.status,
        items: 0,
        recent: 0,
        sampleHost: null,
        error: `${response.status} ${text.slice(0, 80).replace(/\s+/g, " ")}`,
      };
    }
    const items = parseFeedXml(text);
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = items.filter((item) => {
      const at = item.publishedAt?.getTime();
      return at === undefined || at >= cutoff;
    }).length;
    let sampleHost: string | null = null;
    const first = items[0];
    if (first) {
      try {
        sampleHost = new URL(first.url).hostname;
      } catch {
        sampleHost = first.url.slice(0, 48);
      }
    }
    return { slug, status: response.status, items: items.length, recent, sampleHost };
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    const status = message.includes("Timeout") || message.includes("aborted") ? "timeout" : "error";
    return {
      slug,
      status,
      items: 0,
      recent: 0,
      sampleHost: null,
      error: `${message} (${Date.now() - started}ms)`,
    };
  }
}

const rows = await Promise.all(SEED_SOURCES.map((source) => probe(source.slug, source.rssUrl)));
const bad = rows.filter((row) => row.status !== 200 || row.items === 0);
console.log(JSON.stringify({ total: rows.length, bad: bad.length, rows, badRows: bad }, null, 2));
