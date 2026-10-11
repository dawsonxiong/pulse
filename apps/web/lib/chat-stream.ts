import "server-only";
import OpenAI from "openai";
import type { ChatMessage } from "@pulse/shared";

const CHAT_MODEL = "gpt-6-luna";
const MAX_OUTPUT_TOKENS = 1_000;
/** No retry: a failed answer is cheaper to re-ask than to wait out, and stays under maxDuration. */
const OPENAI_TIMEOUT_MS = 60_000;

/**
 * Streams a chat answer as plain-text deltas. `context` is third-party text,
 * so it goes in as user content; developer messages carry more authority.
 */
export async function streamGroundedAnswer({
  instructions,
  context,
  messages,
  signal,
}: {
  instructions: string;
  context: string;
  messages: ChatMessage[];
  signal: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({ timeout: OPENAI_TIMEOUT_MS, maxRetries: 0 });
  const events = await client.responses.create(
    {
      model: CHAT_MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      instructions,
      input: [
        { role: "user", content: context },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      stream: true,
    },
    { signal },
  );

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(event.delta));
          } else if (event.type === "response.failed" || event.type === "error") {
            throw new Error(`chat stream ${event.type}`);
          }
        }
        controller.close();
      } catch (err) {
        console.error(err);
        controller.error(err);
      }
    },
    cancel() {
      events.controller.abort();
    },
  });
}
