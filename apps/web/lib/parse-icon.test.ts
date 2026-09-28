import { describe, expect, it } from "vitest";
import {
  fallbackIconUrls,
  iconCandidatesFromHtml,
  iconPayloadOk,
  orderedIconCandidates,
} from "./parse-icon";

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

  it("ignores mask icons and decodes entities in hrefs", () => {
    const page = `<head>
      <link rel="mask-icon" href="/safari.svg" />
      <link rel="icon" href="https://cdn.example/favicon.png?w=32&amp;h=32" />
    </head>`;
    expect(iconCandidatesFromHtml(page, "https://example.com")).toEqual([
      "https://cdn.example/favicon.png?w=32&h=32",
    ]);
  });
});

describe("orderedIconCandidates", () => {
  it("prefers a publication's square logo over a platform favicon", () => {
    const page = `<head>
      <link rel="icon" href="https://miro.medium.com/v2/5d8de952517e8160e40ef9841c781cdc14a5db313057fa3c3de41c6f5b494b19"/>
      <link rel="apple-touch-icon" sizes="152x152" href="https://miro.medium.com/v2/resize:fill:304:304/10fd5c419ac61637245384e7099e131627900034828f4f386bdaa47a74eae156"/>
      <script type="application/ld+json">{"@type":"Organization","logo":{"url":"https://miro.medium.com/v2/resize:fit:400/1%2Aty4NvNrGg4ReETxqU2N3Og.png"}}</script>
      <img alt="Netflix TechBlog" src="https://miro.medium.com/v2/resize:fill:128:128/1*ty4NvNrGg4ReETxqU2N3Og.png"/>
      <img alt="Netflix TechBlog" src="https://miro.medium.com/v2/resize:fill:160:160/1*ty4NvNrGg4ReETxqU2N3Og.png"/>
    </head>`;
    const urls = orderedIconCandidates(
      page,
      "https://netflixtechblog.com",
      "https://netflixtechblog.com",
    );
    expect(urls[0]).toBe(
      "https://miro.medium.com/v2/resize:fill:160:160/1*ty4NvNrGg4ReETxqU2N3Og.png",
    );
  });

  it("uses a header logo when the page publishes no icon link", () => {
    const page = `<img class="branding__logo" src="/themes/Hax/img/mdn-logo-mono.svg">`;
    const urls = orderedIconCandidates(
      page,
      "https://hacks.mozilla.org/",
      "https://hacks.mozilla.org",
    );
    expect(urls[0]).toBe("https://hacks.mozilla.org/themes/Hax/img/mdn-logo-mono.svg");
  });
});

describe("iconPayloadOk", () => {
  it("accepts PNG and SVG and rejects empty or corrupt ICO bytes", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
    );
    const corruptIco = Uint8Array.from(
      Buffer.from("0000010001002020000001002000efbfbd10000016000000", "hex"),
    );
    expect(iconPayloadOk(png)).toBe(true);
    expect(iconPayloadOk(svg)).toBe(true);
    expect(iconPayloadOk(new Uint8Array(0))).toBe(false);
    expect(iconPayloadOk(corruptIco)).toBe(false);
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
