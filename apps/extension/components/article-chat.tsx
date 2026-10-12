import { useCallback } from "react";
import { streamStoryChat, type ChatSender } from "../lib/api";
import { ChatThread, useChat, type ChatState } from "./chat-thread";

const STARTERS = ["Give me the TL;DR", "What actually changed?", "Why does this matter?"];

/** Chat for the article open in the reader; owned by the reader so tab switches keep it. */
export function useArticleChat(storyId: string, postId: string): ChatState {
  const send = useCallback<ChatSender>(
    (messages, onDelta, signal) => streamStoryChat(storyId, postId, messages, onDelta, signal),
    [storyId, postId],
  );
  return useChat(send, "This article couldn't be loaded for questions.");
}

/** "Ask" tab of the reader. History lives only while the reader is open. */
export function ArticleChat({ chat }: { chat: ChatState }) {
  return (
    <ChatThread
      chat={chat}
      intro="Ask anything about this article. Answers come from its text."
      starters={STARTERS}
      label="Ask about this article"
      placeholder="Ask about this article…"
      sourceNote="From this article"
      formClassName="sticky bottom-1 mt-auto bg-background"
    />
  );
}
