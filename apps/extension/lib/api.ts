import type { FeedResponse, FeedStory, Tag } from "@pulse/shared";

const API_URL = import.meta.env.WXT_API_URL ?? "http://localhost:3000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchFeed(tags: string[]): Promise<FeedStory[]> {
  const params = new URLSearchParams();
  if (tags.length > 0) params.set("tags", tags.join(","));
  const query = params.toString();
  const body = await getJson<FeedResponse>(`/api/feed${query ? `?${query}` : ""}`);
  return body.stories;
}

export async function fetchTags(): Promise<Tag[]> {
  const body = await getJson<{ tags: Tag[] }>("/api/tags");
  return body.tags;
}
