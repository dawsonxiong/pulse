import type { RankableStory } from "./types";

export const RECENCY_HALF_LIFE_MS = 36 * 60 * 60 * 1000;
export const ZERO_OVERLAP_TAG_SCORE = 0.15;

export function recencyDecay(publishedAt: Date, now: Date): number {
  const age = Math.max(0, now.getTime() - publishedAt.getTime());
  return 2 ** -(age / RECENCY_HALF_LIFE_MS);
}

export function tagMatch(storyTags: readonly string[], userTags: readonly string[]): number {
  if (userTags.length === 0) return 1;
  const story = new Set(storyTags);
  const user = new Set(userTags);
  let intersection = 0;
  for (const tag of story) {
    if (user.has(tag)) intersection += 1;
  }
  if (intersection === 0) return ZERO_OVERLAP_TAG_SCORE;
  const union = story.size + user.size - intersection;
  if (union === 0) return 1;
  const jaccard = intersection / union;
  return 0.4 + 0.6 * jaccard;
}

export function scoreStory(story: RankableStory, userTags: readonly string[], now: Date): number {
  const recency = recencyDecay(story.publishedAt, now);
  const tags = tagMatch(story.tags, userTags);
  const authority = story.sourceAuthority;
  const upvoteBoost = 1 + Math.log1p(story.upvotes);
  const downvoteDamp = 1;
  return recency * tags * authority * upvoteBoost * downvoteDamp;
}

export function rankStories<T extends RankableStory>(
  stories: readonly T[],
  userTags: readonly string[],
  now: Date,
): T[] {
  const scored = stories.map((story) => ({
    story,
    score: scoreStory(story, userTags, now),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.story);
}
