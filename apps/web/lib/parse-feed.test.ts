import { describe, expect, it } from "vitest";
import { parseFeedXml } from "./parse-feed";

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

describe("parseFeedXml", () => {
  it("keeps the original title and link", () => {
    const items = parseFeedXml(rss);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Announcing Rust 1.81.0");
    expect(items[0]?.url).toContain("blog.rust-lang.org");
    expect(items[0]?.imageUrl).toContain("rust-social-wide");
  });
});
