import { describe, expect, it } from "vitest";
import { findMatchingStory, jaccard, tokenizeTitle } from "./cluster";
import type { ClusterCandidate } from "./types";

const now = new Date("2026-09-02T12:00:00.000Z");

describe("tokenizeTitle", () => {
  it("drops stopwords and punctuation, keeps version tokens", () => {
    expect(tokenizeTitle("Announcing Rust 1.81.0")).toEqual(["announcing", "rust", "1.81.0"]);
  });
});

describe("jaccard", () => {
  it("is 1 for identical token sets", () => {
    expect(jaccard(["rust", "1.81"], ["rust", "1.81"])).toBe(1);
  });
});

describe("findMatchingStory", () => {
  const rustStory: ClusterCandidate = {
    storyId: "story-1",
    title: "Announcing Rust 1.81.0",
    publishedAt: new Date("2026-09-02T08:00:00.000Z"),
  };

  it("clusters near-identical titles inside the 48h window", () => {
    const match = findMatchingStory(
      "Announcing Rust 1.81.0",
      new Date("2026-09-02T09:00:00.000Z"),
      [rustStory],
      now,
    );
    expect(match).toBe("story-1");
  });

  it("does not cluster unrelated titles even when they share one token", () => {
    const match = findMatchingStory(
      "Postgres 18 Released",
      new Date("2026-09-02T09:00:00.000Z"),
      [rustStory],
      now,
    );
    expect(match).toBeNull();
  });

  it("ignores candidates older than 48 hours", () => {
    const old: ClusterCandidate = {
      storyId: "story-old",
      title: "Announcing Rust 1.81.0",
      publishedAt: new Date("2026-08-30T08:00:00.000Z"),
    };
    const match = findMatchingStory(
      "Announcing Rust 1.81.0",
      new Date("2026-09-02T09:00:00.000Z"),
      [old],
      now,
    );
    expect(match).toBeNull();
  });
});
