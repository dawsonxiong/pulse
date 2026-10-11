import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES, type ChatMessage } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { Input } from "@pulse/ui/components/input";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatError, streamStoryChat } from "../lib/api";

const STARTERS = ["Give me the TL;DR", "What actually changed?", "Why does this matter?"];

function errorCopy(err: unknown): string {
  if (err instanceof ChatError && err.status === 429) {
    return "You've hit the question limit for now. Try again later.";
  }
  if (err instanceof ChatError && err.status === 503) return "Ask isn't available right now.";
  if (err instanceof ChatError && err.status === 404) {
    return "This article couldn't be loaded for questions.";
  }
  return "Something went wrong. Try asking again.";
}

type UiMessage = ChatMessage & { id: number };

export type ArticleChatState = {
  messages: UiMessage[];
  streaming: boolean;
  error: string | null;
  atLimit: boolean;
  ask: (question: string) => void;
  stop: () => void;
};

/**
 * Chat state for one open article. Owned by the reader, not the Ask panel, so
 * switching tabs (which unmounts the panel) keeps the conversation and any
 * answer still streaming.
 */
export function useArticleChat(storyId: string, postId: string): ArticleChatState {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const nextIdRef = useRef(0);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const atLimit = messages.length >= CHAT_MAX_MESSAGES - 1;

  async function ask(question: string) {
    const text = question.trim();
    if (!text || streaming || atLimit) return;
    const id = nextIdRef.current;
    nextIdRef.current += 2;
    const history: UiMessage[] = [...messages, { id, role: "user", content: text }];
    setMessages([...history, { id: id + 1, role: "assistant", content: "" }]);
    setError(null);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamStoryChat(
        storyId,
        postId,
        history.map(({ role, content }) => ({ role, content })),
        (delta) =>
          setMessages((current) => {
            const last = current.at(-1);
            if (last?.role !== "assistant") return current;
            return [...current.slice(0, -1), { ...last, content: last.content + delta }];
          }),
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) setError(errorCopy(err));
      // Drop an empty answer so a retry doesn't send a blank assistant turn.
      setMessages((current) =>
        current.at(-1)?.role === "assistant" && !current.at(-1)?.content
          ? current.slice(0, -1)
          : current,
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return {
    messages,
    streaming,
    error,
    atLimit,
    ask: (question) => void ask(question),
    stop: () => abortRef.current?.abort(),
  };
}

/** "Ask" tab of the reader. History lives only while the reader is open. */
export function ArticleChat({ chat }: { chat: ArticleChatState }) {
  const { messages, streaming, error, atLimit, ask, stop } = chat;
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {messages.length === 0 ? (
        <div className="flex flex-col gap-3 py-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" aria-hidden />
            Ask anything about this article. Answers come from its text.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs text-muted-foreground outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => ask(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-4" aria-live="polite">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <li
                key={message.id}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap"
              >
                {message.content}
              </li>
            ) : (
              <li
                key={message.id}
                className="text-[0.925rem] leading-7 text-pretty whitespace-pre-wrap"
                aria-busy={streaming && index === messages.length - 1}
              >
                {message.content || <span className="text-muted-foreground">Thinking…</span>}
              </li>
            ),
          )}
        </ol>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div ref={endRef} />
      <form
        className="sticky bottom-0 mt-auto flex items-center gap-2 bg-background pt-2 pb-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim() || streaming || atLimit) return;
          ask(draft);
          setDraft("");
        }}
      >
        <Input
          name="question"
          autoComplete="off"
          value={draft}
          maxLength={CHAT_MAX_MESSAGE_CHARS}
          disabled={atLimit}
          placeholder={
            atLimit ? "Question limit reached for this article" : "Ask about this article…"
          }
          aria-label="Ask about this article"
          onChange={(event) => setDraft(event.target.value)}
        />
        {streaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Stop answer"
            onClick={stop}
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            aria-label="Send question"
            disabled={!draft.trim() || atLimit}
          >
            <ArrowUp />
          </Button>
        )}
      </form>
    </div>
  );
}
