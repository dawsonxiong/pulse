export type TagKind = "language" | "tool" | "topic";

export type Tag = {
  slug: string;
  label: string;
  kind: TagKind;
};

export type FeedSource = {
  id: string;
  name: string;
  siteUrl: string;
  iconUrl: string | null;
};

export type FeedPost = {
  id: string;
  url: string;
  title: string;
  author: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: string;
  source: FeedSource;
};

export type FeedStory = {
  id: string;
  publishedAt: string;
  sourceCount: number;
  sourceAuthority: number;
  tags: string[];
  score: number;
  representative: FeedPost;
  posts: FeedPost[];
};

/** One line of the daily AI brief, pointing at the stories it summarizes. */
export type DigestItem = {
  text: string;
  storyIds: string[];
};

/** AI-written overview of the top stories. Separate from cards; never replaces titles. */
export type Digest = {
  id: string;
  generatedAt: string;
  items: DigestItem[];
  /** Snapshot of every story an item references, so the client can open them. */
  stories: FeedStory[];
};

export type DigestResponse = {
  digest: Digest | null;
};

export const FEED_SORTS = ["for-you", "latest"] as const;
export type FeedSort = (typeof FEED_SORTS)[number];

export type FeedResponse = {
  stories: FeedStory[];
  nextCursor: string | null;
};

export type RankableStory = {
  id: string;
  publishedAt: Date;
  tags: string[];
  sourceAuthority: number;
  upvotes: number;
};

export type ClusterCandidate = {
  storyId: string;
  title: string;
  publishedAt: Date;
};

export type StoryArticle = {
  postId: string;
  title: string;
  url: string;
  html: string | null;
  text: string | null;
  excerpt: string | null;
};

export type StoryComment = {
  id: string;
  /** Top-level comment this replies to; null for top-level comments. */
  parentId: string | null;
  displayName: string;
  body: string;
  createdAt: string;
};

/** One turn of "Ask about this article". History lives only in the open reader. */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const CHAT_MAX_MESSAGES = 12;
export const CHAT_MAX_MESSAGE_CHARS = 2000;
