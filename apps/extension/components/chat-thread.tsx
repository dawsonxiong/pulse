import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES, type ChatMessage } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { Input } from "@pulse/ui/components/input";
import { cn } from "@pulse/ui/lib/utils";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChatError, type ChatSender } from "../lib/api";

function errorCopy(err: unknown, notFound: string): string {
  if (err instanceof ChatError && err.status === 429) {
    return "You've hit the question limit for now. Try again later.";
  }
  if (err instanceof ChatError && err.status === 503) return "Ask isn't available right now.";
  if (err instanceof ChatError && err.status === 404) return notFound;
  return "Something went wrong. Try asking again.";
}

type UiMessage = ChatMessage & { id: number };

export type ChatState = {
  messages: UiMessage[];
  streaming: boolean;
  error: string | null;
  atLimit: boolean;
  ask: (question: string) => void;
  stop: () => void;
};

/**
 * Chat state for one conversation. Callers own it above any panel that can
 * unmount, so hiding the thread keeps the history and any answer still streaming.
 */
export function useChat(send: ChatSender, notFoundCopy: string): ChatState {
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
      await send(
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
      if (!controller.signal.aborted) setError(errorCopy(err, notFoundCopy));
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

const plainText = (text: string): ReactNode => text;

type ChatThreadProps = {
  chat: ChatState;
  intro: string;
  starters: string[];
  label: string;
  placeholder: string;
  /** Classes for the message list, e.g. a max height in tight spaces. */
  listClassName?: string;
  /** Classes for the input row, e.g. sticky in the reader. */
  formClassName?: string;
  /** Custom rendering for answer text, e.g. turning "(2)" into a bullet badge. */
  renderAnswer?: (text: string) => ReactNode;
  /**
   * "chat" uses bubbles and reading-size answers (the reader). "compact" is a
   * Q&A log at body text size that sits inline with other content (the brief).
   */
  variant?: "chat" | "compact";
};

export function ChatThread({
  chat,
  intro,
  starters,
  label,
  placeholder,
  listClassName,
  formClassName,
  renderAnswer = plainText,
  variant = "chat",
}: ChatThreadProps) {
  const compact = variant === "compact";
  const { messages, streaming, error, atLimit, ask, stop } = chat;
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  return (
    <div className={cn("flex flex-1 flex-col", compact ? "gap-3" : "gap-4")}>
      {messages.length === 0 ? (
        <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3 py-1")}>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {compact ? null : <Sparkles className="size-4" aria-hidden />}
            {intro}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {starters.map((starter) => (
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
        <ol
          className={cn("flex flex-col", compact ? "gap-1" : "gap-4", listClassName)}
          aria-live="polite"
        >
          {messages.map((message, index) =>
            message.role === "user" ? (
              <li
                key={message.id}
                className={
                  compact
                    ? "mt-3 text-sm font-medium whitespace-pre-wrap first:mt-0"
                    : "max-w-[85%] self-end rounded-2xl rounded-br-md bg-muted px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                }
              >
                {message.content}
              </li>
            ) : (
              <li
                key={message.id}
                className={cn(
                  "text-pretty whitespace-pre-wrap",
                  compact
                    ? "text-sm leading-relaxed text-foreground/80"
                    : "text-[0.925rem] leading-7",
                )}
                aria-busy={streaming && index === messages.length - 1}
              >
                {message.content ? (
                  renderAnswer(message.content)
                ) : (
                  <span className="text-muted-foreground">Thinking…</span>
                )}
              </li>
            ),
          )}
          <li ref={endRef} aria-hidden className="h-0" />
        </ol>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form
        className={cn("flex items-center gap-2", formClassName)}
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
          placeholder={atLimit ? "Question limit reached for this conversation" : placeholder}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value)}
        />
        {streaming ? (
          <Button
            type="button"
            variant="outline"
            size={compact ? "icon-sm" : "icon"}
            aria-label="Stop answer"
            onClick={stop}
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="submit"
            size={compact ? "icon-sm" : "icon"}
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
