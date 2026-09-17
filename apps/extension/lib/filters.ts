import type { FeedSource, FeedStory } from "@pulse/shared";

export const DATE_FILTERS = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "3d", label: "3 days" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
] as const;

export type DateFilter = (typeof DATE_FILTERS)[number]["id"];

export type StoryFilters = {
  date: DateFilter;
  sourceIds: string[];
};

export const EMPTY_FILTERS: StoryFilters = {
  date: "any",
  sourceIds: [],
};

export function dateFilterLabel(id: DateFilter): string {
  return DATE_FILTERS.find((item) => item.id === id)?.label ?? "Any time";
}

export function filtersActive(filters: StoryFilters): boolean {
  return filters.date !== "any" || filters.sourceIds.length > 0;
}

export function activeFilterCount(filters: StoryFilters): number {
  return (filters.date === "any" ? 0 : 1) + filters.sourceIds.length;
}

function dateCutoff(filter: DateFilter, now: Date): number | null {
  if (filter === "any") return null;
  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  const days = filter === "3d" ? 3 : filter === "week" ? 7 : 30;
  return now.getTime() - days * 24 * 60 * 60 * 1000;
}

export function collectSources(stories: FeedStory[]): FeedSource[] {
  const map = new Map<string, FeedSource>();
  for (const story of stories) {
    map.set(story.representative.source.id, story.representative.source);
    for (const post of story.posts) {
      map.set(post.source.id, post.source);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function storyHasSource(story: FeedStory, sourceId: string): boolean {
  if (story.representative.source.id === sourceId) return true;
  return story.posts.some((post) => post.source.id === sourceId);
}

export function storyMatchesFilters(story: FeedStory, filters: StoryFilters, now: Date): boolean {
  if (filters.sourceIds.length > 0 && !filters.sourceIds.some((id) => storyHasSource(story, id))) {
    return false;
  }
  const cutoff = dateCutoff(filters.date, now);
  if (cutoff === null) return true;
  return new Date(story.publishedAt).getTime() >= cutoff;
}
