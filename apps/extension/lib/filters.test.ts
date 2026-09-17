import { fixtureStories } from "@pulse/shared";
import { describe, expect, it } from "vitest";
import { collectSources, EMPTY_FILTERS, storyMatchesFilters, type StoryFilters } from "./filters";

const now = new Date("2026-09-02T15:00:00.000Z");
const stories = fixtureStories(now);

describe("collectSources", () => {
  it("returns unique sources sorted by name", () => {
    const names = collectSources(stories).map((source) => source.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThan(1);
  });
});

describe("storyMatchesFilters", () => {
  it("keeps every story when filters are empty", () => {
    expect(stories.every((story) => storyMatchesFilters(story, EMPTY_FILTERS, now))).toBe(true);
  });

  it("filters by rolling date windows", () => {
    const today: StoryFilters = { ...EMPTY_FILTERS, date: "today" };
    const week: StoryFilters = { ...EMPTY_FILTERS, date: "week" };
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const todayStories = stories.filter((story) => storyMatchesFilters(story, today, now));
    const weekStories = stories.filter((story) => storyMatchesFilters(story, week, now));
    expect(todayStories.length).toBeLessThan(stories.length);
    expect(
      todayStories.every((story) => new Date(story.publishedAt).getTime() >= start.getTime()),
    ).toBe(true);
    expect(weekStories.length).toBeGreaterThanOrEqual(todayStories.length);
  });

  it("filters by source across clustered posts", () => {
    const rust = stories.find((story) => story.posts.some((post) => post.source.id === "src-rust"));
    expect(rust).toBeDefined();
    const onlyRust: StoryFilters = { ...EMPTY_FILTERS, sourceIds: ["src-rust"] };
    expect(storyMatchesFilters(rust!, onlyRust, now)).toBe(true);
    expect(
      stories
        .filter((story) => storyMatchesFilters(story, onlyRust, now))
        .every(
          (story) =>
            story.representative.source.id === "src-rust" ||
            story.posts.some((post) => post.source.id === "src-rust"),
        ),
    ).toBe(true);
  });
});
