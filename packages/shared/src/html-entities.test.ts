import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./html-entities";

describe("decodeHtmlEntities", () => {
  it("decodes numeric apostrophes used by The New Stack", () => {
    expect(decodeHtmlEntities("AI&#8217;s and Perplexity&#8217;s")).toBe(
      "AI\u2019s and Perplexity\u2019s",
    );
  });

  it("decodes hex numeric entities", () => {
    expect(decodeHtmlEntities("AI&#x2019;s")).toBe("AI\u2019s");
  });

  it("decodes named quotes and dashes", () => {
    expect(decodeHtmlEntities("It&rsquo;s a &ldquo;fix&rdquo; &mdash; really")).toBe(
      "It\u2019s a \u201Cfix\u201D \u2014 really",
    );
  });

  it("decodes double-encoded numeric entities", () => {
    expect(decodeHtmlEntities("AI&amp;#8217;s")).toBe("AI\u2019s");
  });

  it("decodes The New Stack titles from production", () => {
    expect(
      decodeHtmlEntities(
        "AI&#8217;s best coding agent fails 60% of the time — and the data backs it up",
      ),
    ).toBe("AI\u2019s best coding agent fails 60% of the time — and the data backs it up");
    expect(decodeHtmlEntities("&#8220;Same mission, bigger stage&#8221;")).toBe(
      "\u201CSame mission, bigger stage\u201D",
    );
  });
});
