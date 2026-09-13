import { describe, expect, it } from "vitest";
import { fallbackIconUrls, iconCandidatesFromHtml } from "./parse-icon";

const html = `<html><head>
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="https://cdn.shopify.com/shopify-favicon.png" />
</head></html>`;

describe("iconCandidatesFromHtml", () => {
  it("prefers apple-touch-icon, then sized PNG, then ico", () => {
    const urls = iconCandidatesFromHtml(html, "https://shopify.engineering/blog");
    expect(urls[0]).toBe("https://shopify.engineering/apple-touch-icon.png");
    expect(urls).toContain("https://cdn.shopify.com/shopify-favicon.png");
    expect(urls.at(-1)).toBe("https://shopify.engineering/favicon.ico");
  });
});

describe("fallbackIconUrls", () => {
  it("uses the source origin, then a Google favicon for that host", () => {
    const urls = fallbackIconUrls("https://shopify.engineering/blog/post");
    expect(urls[0]).toBe("https://shopify.engineering/apple-touch-icon.png");
    expect(urls[1]).toBe("https://shopify.engineering/favicon.ico");
    expect(urls[2]).toContain("domain=shopify.engineering");
  });
});
