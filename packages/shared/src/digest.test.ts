import { describe, expect, it } from "vitest";
import { DIGEST_MAX_ITEMS, DIGEST_MAX_TEXT_LENGTH, sanitizeDigestItems } from "./digest";

describe("sanitizeDigestItems", () => {
  it("drops unknown story ids and items left with none", () => {
    const items = sanitizeDigestItems(
      [
        { text: "Real", storyIds: ["a", "ghost"] },
        { text: "Invented", storyIds: ["ghost"] },
      ],
      ["a", "b"],
    );
    expect(items).toEqual([{ text: "Real", storyIds: ["a"] }]);
  });

  it("dedupes ids, collapses whitespace and skips empty text", () => {
    const items = sanitizeDigestItems(
      [
        { text: "  Two\n  lines ", storyIds: ["a", "a", "b"] },
        { text: "   ", storyIds: ["a"] },
      ],
      ["a", "b"],
    );
    expect(items).toEqual([{ text: "Two lines", storyIds: ["a", "b"] }]);
  });

  it("caps item count and text length", () => {
    const long = "x".repeat(DIGEST_MAX_TEXT_LENGTH + 50);
    const items = sanitizeDigestItems(
      Array.from({ length: DIGEST_MAX_ITEMS + 3 }, () => ({ text: long, storyIds: ["a"] })),
      ["a"],
    );
    expect(items).toHaveLength(DIGEST_MAX_ITEMS);
    expect(items[0]?.text).toHaveLength(DIGEST_MAX_TEXT_LENGTH);
    expect(items[0]?.text.endsWith("…")).toBe(true);
  });
});
