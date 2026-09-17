import { prisma } from "@pulse/db";
import { decodeHtmlEntities, type StoryArticle } from "@pulse/shared";
import { z } from "zod";
import { json, preflight } from "@/lib/cors";
import { extractArticleHtml, fetchArticlePage } from "@/lib/extract-article";
import { isPublicHttpUrl } from "@/lib/public-url";
import { articleLimiter, enforce } from "@/lib/rate-limit";

const idSchema = z.string().uuid();

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await enforce(req, articleLimiter);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return json(req, { error: "invalid id" }, 400);

  const url = new URL(req.url);
  const postIdRaw = url.searchParams.get("postId");
  const postId = postIdRaw && idSchema.safeParse(postIdRaw).success ? postIdRaw : null;

  const postSelect = {
    id: true,
    url: true,
    title: true,
    excerpt: true,
  } as const;

  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      representativePostId: true,
      representativePost: { select: postSelect },
      storyPosts: { select: { post: { select: postSelect } } },
    },
  });
  if (!story) return json(req, { error: "not found" }, 404);

  const posts = story.storyPosts.map((row) => row.post);
  const post =
    posts.find((item) => item.id === (postId ?? story.representativePostId)) ??
    story.representativePost;

  const payload = (html: string | null, text: string | null): StoryArticle => ({
    postId: post.id,
    title: decodeHtmlEntities(post.title),
    url: post.url,
    html,
    text,
    excerpt: post.excerpt ? decodeHtmlEntities(post.excerpt) : null,
  });

  if (!isPublicHttpUrl(post.url)) {
    return json(req, payload(null, post.excerpt));
  }

  try {
    const html = await fetchArticlePage(post.url);
    const extracted = extractArticleHtml(html, post.url);
    if (!extracted) return json(req, payload(null, post.excerpt));
    try {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          extractedHtml: extracted.html,
          extractedText: extracted.text,
          extractedAt: new Date(),
        },
        select: { id: true },
      });
    } catch {
      // extract columns may not be migrated yet; still return the live extract
    }
    return json(req, payload(extracted.html, extracted.text));
  } catch (err) {
    console.error(err);
    return json(req, payload(null, post.excerpt));
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 15;
