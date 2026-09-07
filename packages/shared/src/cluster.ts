import type { ClusterCandidate } from "./types";

export const DEFAULT_MIN_JACCARD = 0.72;
export const DEFAULT_MIN_OVERLAP = 2;
export const DEFAULT_WINDOW_HOURS = 48;

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "for",
  "and",
  "or",
  "how",
  "why",
  "what",
  "is",
  "are",
  "with",
  "from",
  "your",
  "our",
  "this",
  "that",
  "on",
  "at",
  "by",
  "be",
  "as",
  "it",
  "we",
  "you",
  "new",
  "now",
]);

export function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9.+#]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

export function overlappingTokens(a: readonly string[], b: readonly string[]): number {
  const setB = new Set(b);
  let count = 0;
  const seen = new Set<string>();
  for (const token of a) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (setB.has(token)) count += 1;
  }
  return count;
}

export type ClusterOptions = {
  minJaccard?: number;
  minOverlap?: number;
  windowHours?: number;
};

export function findMatchingStory(
  title: string,
  publishedAt: Date,
  candidates: readonly ClusterCandidate[],
  now: Date,
  options: ClusterOptions = {},
): string | null {
  const minJaccard = options.minJaccard ?? DEFAULT_MIN_JACCARD;
  const minOverlap = options.minOverlap ?? DEFAULT_MIN_OVERLAP;
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const windowMs = windowHours * 60 * 60 * 1000;
  const tokens = tokenizeTitle(title);

  let bestId: string | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const age = Math.abs(publishedAt.getTime() - candidate.publishedAt.getTime());
    if (age > windowMs) continue;
    if (now.getTime() - candidate.publishedAt.getTime() > windowMs) continue;

    const other = tokenizeTitle(candidate.title);
    const overlap = overlappingTokens(tokens, other);
    if (overlap < minOverlap) continue;
    const score = jaccard(tokens, other);
    if (score < minJaccard) continue;
    if (score > bestScore) {
      bestScore = score;
      bestId = candidate.storyId;
    }
  }

  return bestId;
}
