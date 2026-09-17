import { describe, expect, it } from "vitest";
import { extractArticleHtml } from "./extract-article";

const ARTICLE = `
<!DOCTYPE html>
<html>
  <body>
    <article>
      <h1>Ship the feed reader</h1>
      <p>Pulse now opens stories in a modal so you can read the extracted article without leaving the new tab.</p>
      <p>Comments stay anonymous and live on the story, not the publisher page.</p>
      <script>document.cookie</script>
      <a href="javascript:alert(1)">bad</a>
    </article>
  </body>
</html>
`;

describe("extractArticleHtml", () => {
  it("extracts readable html and strips unsafe markup", () => {
    const extracted = extractArticleHtml(ARTICLE, "https://example.com/reader");
    expect(extracted).not.toBeNull();
    expect(extracted?.text).toMatch(/extracted article/i);
    expect(extracted?.html).toMatch(/<p>/i);
    expect(extracted?.html).not.toMatch(/script/i);
    expect(extracted?.html).not.toMatch(/javascript:/i);
  });

  it("returns null when the page has no article text", () => {
    expect(
      extractArticleHtml("<html><body><nav>Home</nav></body></html>", "https://example.com"),
    ).toBeNull();
  });
});
