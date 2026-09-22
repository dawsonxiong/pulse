import {
  decorateFeedStory,
  decodeFeedStory,
  type FeedResponse,
  type FeedStory,
  type StoryArticle,
  type StoryComment,
  type Tag,
} from "@pulse/shared";

const API_URL = import.meta.env.WXT_API_URL ?? "http://localhost:3000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`API ${response.status}`);
  return (await response.json()) as T;
}

export type FeedPage = {
  stories: FeedStory[];
  nextCursor: string | null;
};

export async function fetchFeed(tags: string[], cursor?: string | null): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (tags.length > 0) params.set("tags", tags.join(","));
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  const body = await getJson<FeedResponse>(`/api/feed${query ? `?${query}` : ""}`);
  return {
    stories: body.stories.map((story) => decorateFeedStory(decodeFeedStory(story))),
    nextCursor: body.nextCursor,
  };
}

export async function fetchTags(): Promise<Tag[]> {
  const body = await getJson<{ tags: Tag[] }>("/api/tags");
  return body.tags;
}

export async function fetchStoryArticle(storyId: string, postId: string): Promise<StoryArticle> {
  return getJson<StoryArticle>(
    `/api/stories/${storyId}/article?postId=${encodeURIComponent(postId)}`,
  );
}

export async function fetchStoryComments(storyId: string): Promise<StoryComment[]> {
  const body = await getJson<{ comments: StoryComment[] }>(`/api/stories/${storyId}/comments`);
  return body.comments;
}

export async function postStoryComment(
  storyId: string,
  input: { displayName: string; body: string; parentId?: string | null },
): Promise<StoryComment> {
  const response = await fetch(`${API_URL}/api/stories/${storyId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const body = (await response.json()) as { comment: StoryComment };
  return body.comment;
}
