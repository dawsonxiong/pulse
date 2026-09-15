import { describe, expect, it } from "vitest";
import { ogImageFromHtml, parseFeedXml } from "./parse-feed";

const rss = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Rust Blog</title>
    <item>
      <title>Announcing Rust 1.81.0</title>
      <link>https://blog.rust-lang.org/2026/08/29/rust-1.81.0/?utm_source=rss</link>
      <pubDate>Fri, 29 Aug 2026 00:00:00 GMT</pubDate>
      <description>Rust 1.81.0 is out.</description>
      <media:thumbnail url="https://www.rust-lang.org/static/images/rust-social-wide.jpg" />
      <dc:creator>The Rust Team</dc:creator>
    </item>
  </channel>
</rss>`;

const encodedHtmlRss = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Encoded image</title>
      <link>https://example.com/post</link>
      <description>&lt;p&gt;Hello&lt;/p&gt;&lt;img src=&quot;https://cdn.example.com/hero.png&quot; /&gt;</description>
    </item>
  </channel>
</rss>`;

describe("parseFeedXml", () => {
  it("keeps the original title and link", () => {
    const items = parseFeedXml(rss);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Announcing Rust 1.81.0");
    expect(items[0]?.url).toContain("blog.rust-lang.org");
    expect(items[0]?.imageUrl).toContain("rust-social-wide");
  });

  it("reads an image from entity-encoded HTML in description", () => {
    const items = parseFeedXml(encodedHtmlRss);
    expect(items[0]?.imageUrl).toBe("https://cdn.example.com/hero.png");
  });

  it("decodes numeric HTML entities in titles", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>AI&#8217;s and Perplexity&#8217;s new models</title>
      <link>https://thenewstack.io/example</link>
    </item>
  </channel>
</rss>`;
    const items = parseFeedXml(xml);
    expect(items[0]?.title).toBe("AI\u2019s and Perplexity\u2019s new models");
    expect(items[0]?.title).not.toContain("&#");
  });

  it("decodes entities inside CDATA titles", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[AI&#8217;s weekly brief]]></title>
      <link>https://thenewstack.io/cdata</link>
    </item>
  </channel>
</rss>`;
    expect(parseFeedXml(xml)[0]?.title).toBe("AI\u2019s weekly brief");
  });
});

describe("ogImageFromHtml", () => {
  it("reads og:image regardless of attribute order", () => {
    const html = `<html><head>
      <meta content="https://storage.googleapis.com/blog/hero.jpg" property="og:image" />
    </head></html>`;
    expect(ogImageFromHtml(html)).toBe("https://storage.googleapis.com/blog/hero.jpg");
  });
});
