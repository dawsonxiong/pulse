import type { DigestItem } from "./types";

export const DIGEST_MAX_ITEMS = 5;
export const DIGEST_MAX_TEXT_LENGTH = 280;

/**
 * Keeps only items that cite stories we actually sent, drops duplicate
 * citations, and caps count and length. Model output is untrusted.
 */
export function sanitizeDigestItems(
  items: DigestItem[],
  knownStoryIds: Iterable<string>,
): DigestItem[] {
  const known = new Set(knownStoryIds);
  const result: DigestItem[] = [];
  for (const item of items) {
    const text = item.text.replace(/\s+/g, " ").trim();
    const storyIds = [...new Set(item.storyIds)].filter((id) => known.has(id));
    if (!text || storyIds.length === 0) continue;
    result.push({
      text:
        text.length > DIGEST_MAX_TEXT_LENGTH
          ? `${text.slice(0, DIGEST_MAX_TEXT_LENGTH - 1)}…`
          : text,
      storyIds,
    });
    if (result.length === DIGEST_MAX_ITEMS) break;
  }
  return result;
}

export const DIGEST_MAX_CITATIONS = 3;

/**
 * Keeps a bullet's citations readable: at most one story per outlet (the
 * first cited, which the model lists most relevant first) and at most
 * `max` stories. `sourceOf` maps a story id to its outlet; unknown ids are dropped.
 */
export function limitCitations(
  items: DigestItem[],
  sourceOf: (storyId: string) => string | undefined,
  max = DIGEST_MAX_CITATIONS,
): DigestItem[] {
  return items.map((item) => {
    const seenSources = new Set<string>();
    const storyIds: string[] = [];
    for (const id of item.storyIds) {
      const source = sourceOf(id);
      if (!source || seenSources.has(source)) continue;
      seenSources.add(source);
      storyIds.push(id);
      if (storyIds.length === max) break;
    }
    return { ...item, storyIds };
  });
}
