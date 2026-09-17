import { hostnameFromUrl, isShortUrlHost, resolveHttpUrl } from "@pulse/shared";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { isPublicHttpUrl } from "./public-url";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_500_000;
const ALLOWED_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "UL",
  "OL",
  "LI",
  "A",
  "STRONG",
  "EM",
  "B",
  "I",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "BR",
  "IMG",
  "FIGURE",
  "FIGCAPTION",
  "HR",
  "SPAN",
]);

export type ExtractedArticle = {
  html: string;
  text: string;
};

function dropNode(node: Element): void {
  node.replaceWith(...Array.from(node.childNodes));
}

function sanitizeHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  if (!isPublicHttpUrl(trimmed)) return null;
  return trimmed;
}

function sanitize(document: Document): void {
  const nodes = Array.from(document.body.querySelectorAll("*"));
  for (const node of nodes) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      dropNode(node);
      continue;
    }
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "srcset") {
        node.removeAttribute(attr.name);
        continue;
      }
      if (node.tagName === "A" && name === "href") {
        const href = sanitizeHref(attr.value);
        if (href) {
          node.setAttribute("href", href);
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noreferrer noopener");
        } else {
          node.removeAttribute("href");
        }
        continue;
      }
      if (node.tagName === "IMG" && name === "src") {
        const src = sanitizeHref(attr.value);
        if (src) node.setAttribute("src", src);
        else node.remove();
        continue;
      }
      if (name !== "alt" && name !== "title" && name !== "href" && name !== "src") {
        node.removeAttribute(attr.name);
      }
    }
  }
}

export function extractArticleHtml(html: string, url: string): ExtractedArticle | null {
  const source = /<html[\s>]/i.test(html)
    ? html
    : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
  const { document } = parseHTML(source);
  const head = document.head;
  if (head) {
    const base = document.createElement("base");
    base.setAttribute("href", url);
    head.insertBefore(base, head.firstChild);
  }

  let parsed: ReturnType<Readability["parse"]>;
  try {
    parsed = new Readability(document).parse();
  } catch {
    return null;
  }
  if (!parsed?.content) return null;

  const { document: clean } = parseHTML(
    `<!DOCTYPE html><html><body>${parsed.content}</body></html>`,
  );
  sanitize(clean);
  const content = clean.body.innerHTML.trim();
  const text = (parsed.textContent ?? clean.body.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!content || text.length < 40) return null;
  return { html: content, text };
}

async function followShortUrl(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 5; hop += 1) {
    if (!isShortUrlHost(hostnameFromUrl(current))) return current;
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(4_000),
        headers: { "User-Agent": "PulseIngest/0.1 (+https://github.com/pulse)" },
      });
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) return response.url || current;
      current = resolveHttpUrl(location, current) ?? current;
    } catch {
      return current;
    }
  }
  return current;
}

export async function fetchArticlePage(url: string): Promise<string> {
  const target = await followShortUrl(url);
  const response = await fetch(target, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: {
      "User-Agent": "PulseIngest/0.1 (+https://github.com/pulse)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const finalUrl = response.url || target;
  if (!isPublicHttpUrl(finalUrl)) throw new Error("blocked redirect");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML_BYTES) throw new Error("article too large");
  return new TextDecoder("utf-8").decode(buffer);
}
