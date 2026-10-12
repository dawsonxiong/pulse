import { CHAT_MAX_MESSAGE_CHARS, CHAT_MAX_MESSAGES, type ChatMessage } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { Textarea } from "@pulse/ui/components/textarea";
import { cn } from "@pulse/ui/lib/utils";
import { ArrowUp, Check, Copy, RotateCcw, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { parseAnswer } from "../lib/answer-blocks";
import { ChatError, type ChatSender } from "../lib/api";

export type ChatErrorState = { text: string; retryable: boolean };

function describeError(err: unknown, notFound: string): ChatErrorState {
  const status = err instanceof ChatError ? err.status : 0;
  if (status === 429) {
    return { text: "You've hit the question limit for now. Try again later.", retryable: false };
  }
  if (status === 503) return { text: "Ask isn't available right now.", retryable: false };
  if (status === 404) return { text: notFound, retryable: false };
  return { text: "The answer didn't come through.", retryable: true };
}

type UiMessage = ChatMessage & { id: number };

export type ChatState = {
  messages: UiMessage[];
  streaming: boolean;
  error: ChatErrorState | null;
  atLimit: boolean;
  ask: (question: string) => void;
  /** Re-asks the last question, replacing a failed or unwanted answer. */
  retry: () => void;
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
  const [error, setError] = useState<ChatErrorState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const atLimit = messages.length >= CHAT_MAX_MESSAGES - 1;

  /** Streams an answer to `history`, whose last message is the question. */
  async function run(history: UiMessage[]) {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setMessages([...history, { id, role: "assistant", content: "" }]);
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
      if (!controller.signal.aborted) setError(describeError(err, notFoundCopy));
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

  function ask(question: string) {
    const text = question.trim();
    if (!text || streaming || atLimit) return;
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    void run([...messages, { id, role: "user", content: text }]);
  }

  function retry() {
    if (streaming) return;
    const lastQuestion = messages.findLastIndex((message) => message.role === "user");
    if (lastQuestion === -1) return;
    void run(messages.slice(0, lastQuestion + 1));
  }

  return {
    messages,
    streaming,
    error,
    atLimit,
    ask,
    retry,
    stop: () => abortRef.current?.abort(),
  };
}

/**
 * Renders an answer's plain text: blank-line paragraphs and "- " lists, with
 * `renderInline` applied to the text inside each block.
 */
function AnswerBody({
  text,
  renderInline,
  caret,
  compact,
}: {
  text: string;
  renderInline: (text: string) => ReactNode;
  caret: ReactNode;
  compact: boolean;
}) {
  const visible = parseAnswer(text);
  if (visible.length === 0) return <p>{caret}</p>;

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2.5")}>
      {visible.map((block, blockIndex) => {
        const isLast = blockIndex === visible.length - 1;
        if (block.kind === "ul") {
          return (
            <ul
              key={block.line}
              className={cn(
                "flex list-disc flex-col marker:text-muted-foreground",
                compact ? "gap-0.5 pl-4" : "gap-1 pl-5",
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={item.line}>
                  {renderInline(item.text)}
                  {isLast && itemIndex === block.items.length - 1 ? caret : null}
                </li>
              ))}
            </ul>
          );
        }
        return (
          // pre-line keeps single line breaks inside a paragraph.
          <p key={block.line} className="whitespace-pre-line">
            {renderInline(block.lines.join("\n"))}
            {isLast ? caret : null}
          </p>
        );
      })}
    </div>
  );
}

/** Blinking bar shown at the end of an answer while it streams. */
function StreamingCaret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] rounded-full bg-primary motion-safe:animate-pulse"
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const label = copied ? "Copied" : "Copy answer";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      title={label}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

const plainText = (text: string): ReactNode => text;

type ChatThreadProps = {
  chat: ChatState;
  /** Shown above the starters before the first question (reader only). */
  intro: string;
  starters: string[];
  label: string;
  placeholder: string;
  /** Classes for the message list, e.g. a max height in tight spaces. */
  listClassName?: string;
  /** Classes for the composer row, e.g. sticky in the reader. */
  formClassName?: string;
  /** Custom rendering for answer text, e.g. turning "(2)" into a bullet badge. */
  renderAnswer?: (text: string) => ReactNode;
  /**
   * "chat" uses bubbles and reading-size answers (the reader). "compact" is a
   * Q&A log at body text size that sits inline with other content (the brief):
   * just the composer until focused, with starters revealed under it.
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
  const { messages, streaming, error, atLimit, ask, retry, stop } = chat;
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const empty = messages.length === 0;
  const lastIndex = messages.length - 1;

  function submit() {
    if (!draft.trim() || streaming || atLimit) return;
    ask(draft);
    setDraft("");
  }

  const starterButtons = (
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
  );

  return (
    <div className={cn("group/chat flex flex-1 flex-col", compact ? "gap-2" : "gap-4")}>
      {empty && !compact ? (
        <div className="flex flex-col gap-3 py-1">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4" aria-hidden />
            {intro}
          </p>
          {starterButtons}
        </div>
      ) : null}
      {empty ? null : (
        <ol
          className={cn("flex flex-col", compact ? "gap-1" : "gap-4", listClassName)}
          aria-live="polite"
        >
          {messages.map((message, index) => {
            if (message.role === "user") {
              return (
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
              );
            }
            const live = streaming && index === lastIndex;
            return (
              <li
                key={message.id}
                className={cn(
                  "flex flex-col text-pretty",
                  compact ? "gap-1" : "gap-1.5",
                  compact
                    ? "text-sm leading-relaxed text-foreground/80"
                    : "text-[0.925rem] leading-7",
                )}
                aria-busy={live}
              >
                {live && !message.content ? <span className="sr-only">Answering…</span> : null}
                <AnswerBody
                  text={message.content}
                  renderInline={renderAnswer}
                  caret={live ? <StreamingCaret /> : null}
                  compact={compact}
                />
                {live ? null : (
                  // Icons only; -ml-1.5 lines the first icon up with the text edge.
                  <div className="-ml-1.5 flex items-center gap-0.5">
                    <CopyButton text={message.content} />
                    {index === lastIndex ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        title="Try again"
                        aria-label="Try again"
                        className="text-muted-foreground hover:text-foreground"
                        disabled={streaming}
                        onClick={retry}
                      >
                        <RotateCcw />
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
          <li ref={endRef} aria-hidden className="h-0" />
        </ol>
      )}
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          {error.text}
          {error.retryable ? (
            <Button type="button" variant="outline" size="xs" onClick={retry}>
              <RotateCcw data-icon="inline-start" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
      <form
        className={cn(
          "flex items-end gap-2 rounded-xl border border-input bg-input/30 p-1.5 pl-3 transition-colors focus-within:border-ring/70 focus-within:ring-2 focus-within:ring-ring/20",
          formClassName,
        )}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          name="question"
          rows={1}
          value={draft}
          maxLength={CHAT_MAX_MESSAGE_CHARS}
          disabled={atLimit}
          placeholder={atLimit ? "Question limit reached for this conversation" : placeholder}
          aria-label={label}
          className="max-h-40 min-h-0 resize-none self-center border-0 bg-transparent px-0 py-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter (or composing CJK text) adds a line.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {streaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Stop answer"
            onClick={stop}
          >
            <Square />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon-sm"
            aria-label="Send question"
            disabled={!draft.trim() || atLimit}
          >
            <ArrowUp />
          </Button>
        )}
      </form>
      {empty && compact ? (
        // Starters stay out of the way until the composer is focused.
        <div className="hidden group-focus-within/chat:block">{starterButtons}</div>
      ) : null}
    </div>
  );
}
