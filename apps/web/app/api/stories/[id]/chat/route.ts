import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES } from "@pulse/shared";
import { z } from "zod";
import { loadArticleContext, streamArticleAnswer } from "@/lib/article-chat";
import { corsHeaders, json, preflight } from "@/lib/cors";
import { enforceChat } from "@/lib/rate-limit";

const idSchema = z.string().uuid();

const bodySchema = z.object({
  postId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(CHAT_MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(CHAT_MAX_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === "user", "last message must be from the user"),
});

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await enforceChat(req);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return json(req, { error: "invalid id" }, 400);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(req, { error: "invalid body" }, 400);

  if (!process.env.OPENAI_API_KEY || !process.env.DATABASE_URL) {
    return json(req, { error: "chat is not configured" }, 503);
  }

  const article = await loadArticleContext(id, parsed.data.postId);
  if (!article) return json(req, { error: "article not available" }, 404);

  try {
    const stream = await streamArticleAnswer(article, parsed.data.messages, req.signal);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        ...corsHeaders(req),
      },
    });
  } catch (err) {
    console.error(err);
    return json(req, { error: "chat failed" }, 502);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;
