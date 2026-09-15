import { decodeHtmlEntities } from "./html-entities";
import type { Tag } from "./types";

export const TAG_CATALOG: readonly Tag[] = [
  { slug: "typescript", label: "TypeScript", kind: "language" },
  { slug: "javascript", label: "JavaScript", kind: "language" },
  { slug: "python", label: "Python", kind: "language" },
  { slug: "rust", label: "Rust", kind: "language" },
  { slug: "go", label: "Go", kind: "language" },
  { slug: "java", label: "Java", kind: "language" },
  { slug: "kotlin", label: "Kotlin", kind: "language" },
  { slug: "swift", label: "Swift", kind: "language" },
  { slug: "ruby", label: "Ruby", kind: "language" },
  { slug: "php", label: "PHP", kind: "language" },
  { slug: "csharp", label: "C#", kind: "language" },
  { slug: "cpp", label: "C++", kind: "language" },
  { slug: "c", label: "C", kind: "language" },
  { slug: "scala", label: "Scala", kind: "language" },
  { slug: "elixir", label: "Elixir", kind: "language" },
  { slug: "haskell", label: "Haskell", kind: "language" },
  { slug: "zig", label: "Zig", kind: "language" },
  { slug: "sql", label: "SQL", kind: "language" },
  { slug: "react", label: "React", kind: "tool" },
  { slug: "nextjs", label: "Next.js", kind: "tool" },
  { slug: "vue", label: "Vue", kind: "tool" },
  { slug: "svelte", label: "Svelte", kind: "tool" },
  { slug: "angular", label: "Angular", kind: "tool" },
  { slug: "node", label: "Node.js", kind: "tool" },
  { slug: "deno", label: "Deno", kind: "tool" },
  { slug: "bun", label: "Bun", kind: "tool" },
  { slug: "postgres", label: "Postgres", kind: "tool" },
  { slug: "mysql", label: "MySQL", kind: "tool" },
  { slug: "sqlite", label: "SQLite", kind: "tool" },
  { slug: "redis", label: "Redis", kind: "tool" },
  { slug: "mongodb", label: "MongoDB", kind: "tool" },
  { slug: "prisma", label: "Prisma", kind: "tool" },
  { slug: "kubernetes", label: "Kubernetes", kind: "tool" },
  { slug: "docker", label: "Docker", kind: "tool" },
  { slug: "aws", label: "AWS", kind: "tool" },
  { slug: "gcp", label: "GCP", kind: "tool" },
  { slug: "azure", label: "Azure", kind: "tool" },
  { slug: "cloudflare", label: "Cloudflare", kind: "tool" },
  { slug: "vercel", label: "Vercel", kind: "tool" },
  { slug: "linux", label: "Linux", kind: "tool" },
  { slug: "git", label: "Git", kind: "tool" },
  { slug: "github", label: "GitHub", kind: "tool" },
  { slug: "graphql", label: "GraphQL", kind: "tool" },
  { slug: "tailwind", label: "Tailwind", kind: "tool" },
  { slug: "wasm", label: "WebAssembly", kind: "tool" },
  { slug: "terraform", label: "Terraform", kind: "tool" },
  { slug: "security", label: "Security", kind: "topic" },
  { slug: "performance", label: "Performance", kind: "topic" },
  { slug: "testing", label: "Testing", kind: "topic" },
  { slug: "databases", label: "Databases", kind: "topic" },
  { slug: "distributed-systems", label: "Distributed systems", kind: "topic" },
  { slug: "frontend", label: "Frontend", kind: "topic" },
  { slug: "backend", label: "Backend", kind: "topic" },
  { slug: "devops", label: "DevOps", kind: "topic" },
  { slug: "ai", label: "AI", kind: "topic" },
  { slug: "open-source", label: "Open source", kind: "topic" },
  { slug: "web", label: "Web", kind: "topic" },
  { slug: "css", label: "CSS", kind: "topic" },
  { slug: "networking", label: "Networking", kind: "topic" },
  { slug: "compilers", label: "Compilers", kind: "topic" },
];

export const TAG_BY_SLUG: ReadonlyMap<string, Tag> = new Map(
  TAG_CATALOG.map((tag) => [tag.slug, tag]),
);

const TITLE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  typescript: ["typescript", "ts 5", "ts5"],
  javascript: ["javascript"],
  nextjs: ["next.js", "nextjs", "next js"],
  node: ["node.js", "nodejs"],
  postgres: ["postgres", "postgresql"],
  kubernetes: ["kubernetes", "k8s"],
  cloudflare: ["cloudflare", "workers"],
  wasm: ["webassembly", "wasm"],
  csharp: ["c#", "csharp"],
  cpp: ["c++"],
  go: ["golang"],
  graphql: ["graphql"],
  tailwind: ["tailwind"],
  prisma: ["prisma"],
};

const SHORT_SLUG_MIN = 3;

export function tagsFromTitle(title: string, catalog: readonly Tag[] = TAG_CATALOG): string[] {
  const haystack = ` ${decodeHtmlEntities(title).toLowerCase()} `;
  const found: string[] = [];

  for (const tag of catalog) {
    const needles =
      TITLE_ALIASES[tag.slug] ??
      (tag.slug.length >= SHORT_SLUG_MIN ? [tag.slug, tag.label.toLowerCase()] : []);
    const matched = needles.some((needle) => {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
    });
    if (matched) found.push(tag.slug);
  }

  return found;
}
