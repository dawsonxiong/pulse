import { decodeFeedStory, fixtureStories, type FeedPost, type FeedStory } from "@pulse/shared";
import { z } from "zod";

const feedPostSchema: z.ZodType<FeedPost> = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  excerpt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  publishedAt: z.string(),
  source: z.object({
    id: z.string(),
    name: z.string(),
    siteUrl: z.string(),
    iconUrl: z.string().nullable().default(null),
  }),
});

const feedStorySchema: z.ZodType<FeedStory> = z.object({
  id: z.string(),
  publishedAt: z.string(),
  sourceCount: z.number(),
  sourceAuthority: z.number(),
  tags: z.array(z.string()),
  score: z.number(),
  representative: feedPostSchema,
  posts: z.array(feedPostSchema),
});

export const localStateSchema = z.object({
  onboarded: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  hiddenStoryIds: z.array(z.string()).default([]),
  bookmarks: z
    .array(
      z.object({
        storyId: z.string(),
        savedAt: z.string(),
        story: feedStorySchema,
      }),
    )
    .default([]),
  votes: z
    .array(
      z.object({
        storyId: z.string(),
        value: z.enum(["up", "down"]),
      }),
    )
    .default([]),
  feedCache: z
    .object({
      fetchedAt: z.string(),
      stories: z.array(feedStorySchema),
    })
    .nullable()
    .default(null),
  feedCacheVersion: z.number().default(0),
  sort: z.enum(["for-you", "latest"]).default("for-you"),
});

export type LocalState = z.infer<typeof localStateSchema>;

export const EMPTY_STATE: LocalState = localStateSchema.parse({});

function storageArea(): chrome.storage.StorageArea | null {
  return globalThis.chrome?.storage?.local ?? null;
}

export const FEED_CACHE_VERSION = 7;

export async function loadState(): Promise<LocalState> {
  const area = storageArea();
  if (!area) return EMPTY_STATE;
  const raw = await area.get(null);
  const parsed = localStateSchema.safeParse(raw);
  if (!parsed.success) return EMPTY_STATE;
  if (parsed.data.feedCacheVersion !== FEED_CACHE_VERSION) {
    return { ...parsed.data, feedCache: null, feedCacheVersion: FEED_CACHE_VERSION };
  }
  return parsed.data;
}

export async function saveState(state: LocalState): Promise<void> {
  const area = storageArea();
  if (!area) return;
  await area.set({ ...state, feedCacheVersion: FEED_CACHE_VERSION });
}

export function cachedOrFixture(state: LocalState): FeedStory[] {
  if (state.feedCache && state.feedCache.stories.length > 0) {
    return state.feedCache.stories.map(decodeFeedStory);
  }
  return fixtureStories();
}
