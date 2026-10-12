import { z } from "zod";
import { chatMessagesSchema } from "@/lib/chat-schema";
import { corsHeaders, json, preflight } from "@/lib/cors";
import { loadDigestContext, streamDigestAnswer } from "@/lib/digest-chat";
import { enforceChat } from "@/lib/rate-limit";

const bodySchema = z.object({
  digestId: z.string().uuid(),
  messages: chatMessagesSchema,
});

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const limited = await enforceChat(req);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(req, { error: "invalid body" }, 400);

  if (!process.env.OPENAI_API_KEY || !process.env.DATABASE_URL) {
    return json(req, { error: "chat is not configured" }, 503);
  }

  const context = await loadDigestContext(parsed.data.digestId);
  if (!context) return json(req, { error: "brief not found" }, 404);

  try {
    const stream = await streamDigestAnswer(context, parsed.data.messages, req.signal);
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
