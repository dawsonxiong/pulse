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
