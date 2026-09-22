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
