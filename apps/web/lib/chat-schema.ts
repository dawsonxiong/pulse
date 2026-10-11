import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES } from "@pulse/shared";
import { z } from "zod";

/** History sent by the client for one chat turn; the last message is the new question. */
export const chatMessagesSchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(CHAT_MAX_MESSAGE_CHARS),
    }),
  )
  .min(1)
  .max(CHAT_MAX_MESSAGES)
  .refine((messages) => messages.at(-1)?.role === "user", "last message must be from the user");
