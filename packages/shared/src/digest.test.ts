import { describe, expect, it } from "vitest";
import {
  DIGEST_MAX_ITEMS,
  DIGEST_MAX_TEXT_LENGTH,
  limitCitations,
  sanitizeDigestItems,
} from "./digest";

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

describe("limitCitations", () => {
  const sources: Record<string, string> = {
    g1: "grafana",
    g2: "grafana",
    g3: "grafana",
    c1: "cloudflare",
    v1: "vercel",
    n1: "node",
  };
  const sourceOf = (id: string) => sources[id];

  it("keeps the first story from each outlet", () => {
    const [item] = limitCitations(
      [{ text: "Grafana news", storyIds: ["g1", "g2", "g3"] }],
      sourceOf,
    );
    expect(item?.storyIds).toEqual(["g1"]);
  });

  it("keeps different outlets in order, capped at three", () => {
    const [item] = limitCitations(
      [{ text: "Many outlets", storyIds: ["c1", "g1", "c1", "v1", "g2", "n1"] }],
      sourceOf,
    );
    expect(item?.storyIds).toEqual(["c1", "g1", "v1"]);
  });

  it("drops ids with no known outlet", () => {
    const [item] = limitCitations([{ text: "Ghost", storyIds: ["ghost", "v1"] }], sourceOf);
    expect(item?.storyIds).toEqual(["v1"]);
  });
});
