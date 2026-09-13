import type { FeedPost, FeedSource, FeedStory } from "./types";

const hour = 60 * 60 * 1000;

function iso(hoursAgo: number, now = new Date("2026-09-02T15:00:00.000Z")): string {
  return new Date(now.getTime() - hoursAgo * hour).toISOString();
}

function source(id: string, name: string, siteUrl: string): FeedSource {
  return { id, name, siteUrl, iconUrl: null };
}

function post(input: {
  id: string;
  url: string;
  title: string;
  author: string | null;
  excerpt: string;
  imageUrl: string | null;
  hoursAgo: number;
  source: FeedSource;
  now?: Date;
}): FeedPost {
  return {
    id: input.id,
    url: input.url,
    title: input.title,
    author: input.author,
    excerpt: input.excerpt,
    imageUrl: input.imageUrl,
    publishedAt: iso(input.hoursAgo, input.now),
    source: input.source,
  };
}

function story(input: {
  id: string;
  hoursAgo: number;
  sourceCount: number;
  sourceAuthority: number;
  tags: string[];
  posts: FeedPost[];
  now?: Date;
}): FeedStory {
  const representative = input.posts[0];
  if (!representative) throw new Error("story needs a post");
  return {
    id: input.id,
    publishedAt: iso(input.hoursAgo, input.now),
    sourceCount: input.sourceCount,
    sourceAuthority: input.sourceAuthority,
    tags: input.tags,
    score: 0,
    representative,
    posts: input.posts,
  };
}

export function fixtureStories(now = new Date("2026-09-02T15:00:00.000Z")): FeedStory[] {
  const rust = source("src-rust", "Rust Blog", "https://blog.rust-lang.org");
  const twir = source("src-twir", "This Week in Rust", "https://this-week-in-rust.org");
  const pg = source("src-pg", "PostgreSQL", "https://www.postgresql.org");
  const react = source("src-react", "React Blog", "https://react.dev");
  const go = source("src-go", "The Go Blog", "https://go.dev");
  const cf = source("src-cf", "Cloudflare Blog", "https://blog.cloudflare.com");
  const k8s = source("src-k8s", "Kubernetes", "https://kubernetes.io");
  const gh = source("src-gh", "The GitHub Blog", "https://github.blog");

  const rustPost = post({
    id: "post-rust-blog",
    url: "https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/",
    title: "Announcing Rust 1.81.0",
    author: "The Rust Team",
    excerpt: "Rust 1.81.0 is out, with lint improvements and stdlib work.",
    imageUrl: "https://www.rust-lang.org/static/images/rust-social-wide.jpg",
    hoursAgo: 4,
    source: rust,
    now,
  });

  return [
    story({
      id: "story-rust-1.81",
      hoursAgo: 4,
      sourceCount: 2,
      sourceAuthority: 0.92,
      tags: ["rust", "compilers"],
      now,
      posts: [
        rustPost,
        post({
          id: "post-thisweek",
          url: "https://this-week-in-rust.org/blog/2024/09/04/this-week-in-rust-562/",
          title: "Announcing Rust 1.81.0",
          author: "This Week in Rust",
          excerpt: "The 1.81.0 release landed this week.",
          imageUrl: null,
          hoursAgo: 5,
          source: twir,
          now,
        }),
      ],
    }),
    story({
      id: "story-pg-18",
      hoursAgo: 10,
      sourceCount: 1,
      sourceAuthority: 0.88,
      tags: ["postgres", "databases", "sql"],
      now,
      posts: [
        post({
          id: "post-pg",
          url: "https://www.postgresql.org/about/news/postgresql-18-released-3148/",
          title: "PostgreSQL 18 Released",
          author: "PostgreSQL Global Development Group",
          excerpt: "PostgreSQL 18 is now available.",
          imageUrl: "https://www.postgresql.org/media/img/about/press/elephant.png",
          hoursAgo: 10,
          source: pg,
          now,
        }),
      ],
    }),
    story({
      id: "story-react-compiler",
      hoursAgo: 20,
      sourceCount: 1,
      sourceAuthority: 0.95,
      tags: ["react", "javascript", "frontend"],
      now,
      posts: [
        post({
          id: "post-react",
          url: "https://react.dev/blog/2025/10/07/react-compiler-1",
          title: "React Compiler v1.0",
          author: "The React Team",
          excerpt: "The React Compiler is stable and recommended for new apps.",
          imageUrl: "https://react.dev/images/og-home.png",
          hoursAgo: 20,
          source: react,
          now,
        }),
      ],
    }),
    story({
      id: "story-go-1-24",
      hoursAgo: 8,
      sourceCount: 1,
      sourceAuthority: 0.93,
      tags: ["go", "backend"],
      now,
      posts: [
        post({
          id: "post-go",
          url: "https://go.dev/blog/go1.24",
          title: "Go 1.24 is released",
          author: "The Go Team",
          excerpt: "Go 1.24 is available.",
          imageUrl: "https://go.dev/blog/go-brand/Go-Logo/PNG/Go-Logo_Blue.png",
          hoursAgo: 8,
          source: go,
          now,
        }),
      ],
    }),
    story({
      id: "story-cf-workers",
      hoursAgo: 14,
      sourceCount: 1,
      sourceAuthority: 0.95,
      tags: ["cloudflare", "performance", "web"],
      now,
      posts: [
        post({
          id: "post-cf",
          url: "https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/",
          title: "Details of the Cloudflare outage on July 2, 2019",
          author: "Cloudflare",
          excerpt: "A postmortem of a global Cloudflare outage.",
          imageUrl: null,
          hoursAgo: 14,
          source: cf,
          now,
        }),
      ],
    }),
    story({
      id: "story-k8s-132",
      hoursAgo: 30,
      sourceCount: 1,
      sourceAuthority: 0.9,
      tags: ["kubernetes", "devops"],
      now,
      posts: [
        post({
          id: "post-k8s",
          url: "https://kubernetes.io/blog/2024/12/11/kubernetes-v1-32-release/",
          title: "Kubernetes v1.32",
          author: "Kubernetes",
          excerpt: "Kubernetes 1.32 is now available.",
          imageUrl: "https://kubernetes.io/images/kubernetes-horizontal-color.png",
          hoursAgo: 30,
          source: k8s,
          now,
        }),
      ],
    }),
    story({
      id: "story-github-copilot",
      hoursAgo: 6,
      sourceCount: 1,
      sourceAuthority: 0.91,
      tags: ["github", "ai", "devtools"],
      now,
      posts: [
        post({
          id: "post-gh",
          url: "https://github.blog/news-insights/product-news/github-copilot-coding-agent/",
          title: "GitHub Copilot coding agent",
          author: "GitHub",
          excerpt: "Copilot can open PRs from assigned issues.",
          imageUrl: "https://github.blog/wp-content/uploads/2024/10/github-copilot.png",
          hoursAgo: 6,
          source: gh,
          now,
        }),
      ],
    }),
    story({
      id: "story-react-labs",
      hoursAgo: 40,
      sourceCount: 1,
      sourceAuthority: 0.9,
      tags: ["react", "javascript"],
      now,
      posts: [
        post({
          id: "post-react-labs",
          url: "https://react.dev/blog/2025/04/23/react-labs-what-we-shipped-in-19-1",
          title: "React Labs: what we shipped in 19.1",
          author: "The React Team",
          excerpt: "Updates from React Labs.",
          imageUrl: "https://react.dev/images/og-home.png",
          hoursAgo: 40,
          source: react,
          now,
        }),
      ],
    }),
  ];
}
