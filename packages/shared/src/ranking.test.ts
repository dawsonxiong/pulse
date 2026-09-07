import { describe, expect, it } from "vitest";
import { RECENCY_HALF_LIFE_MS, scoreStory, tagMatch } from "./ranking";
import type { RankableStory } from "./types";

const now = new Date("2026-09-02T12:00:00.000Z");

function story(overrides: Partial<RankableStory> = {}): RankableStory {
  return {
    id: "s1",
    publishedAt: now,
    tags: ["rust"],
    sourceAuthority: 1,
    upvotes: 0,
    ...overrides,
  };
}

describe("tagMatch", () => {
  it("returns 1 when the user has not picked tags", () => {
    expect(tagMatch(["rust"], [])).toBe(1);
  });

  it("still scores zero-overlap stories above zero so they are not dropped", () => {
    expect(tagMatch(["typescript"], ["rust"])).toBe(0.15);
  });

  it("rewards Jaccard overlap without collapsing to zero on a partial match", () => {
    const partial = tagMatch(["rust", "compilers"], ["rust"]);
    expect(partial).toBeGreaterThan(0.15);
    expect(partial).toBeLessThan(1);
  });
});

describe("scoreStory", () => {
  it("halves recency after one half-life", () => {
    const fresh = scoreStory(story(), ["rust"], now);
    const aged = scoreStory(
      story({ publishedAt: new Date(now.getTime() - RECENCY_HALF_LIFE_MS) }),
      ["rust"],
      now,
    );
    expect(aged / fresh).toBeCloseTo(0.5, 5);
  });

  it("boosts stories that the user upvoted", () => {
    const base = scoreStory(story({ upvotes: 0 }), ["rust"], now);
    const liked = scoreStory(story({ upvotes: 3 }), ["rust"], now);
    expect(liked).toBeGreaterThan(base);
  });

  it("never mutates the story title — ranking is score-only", () => {
    const input = story();
    scoreStory(input, ["rust"], now);
    expect(input).toEqual(story());
  });
});
