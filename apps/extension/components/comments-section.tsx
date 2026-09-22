import type { StoryComment } from "@pulse/shared";
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/components/alert";
import { Avatar, AvatarFallback } from "@pulse/ui/components/avatar";
import { Button } from "@pulse/ui/components/button";
import { Field, FieldError, FieldLabel } from "@pulse/ui/components/field";
import { Input } from "@pulse/ui/components/input";
import { Spinner } from "@pulse/ui/components/spinner";
import { Textarea } from "@pulse/ui/components/textarea";
import { AlertCircle, Reply, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchStoryComments, postStoryComment } from "../lib/api";
import { relativeTime } from "../lib/time";

type CommentsSectionProps = {
  storyId: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
};

type Thread = { comment: StoryComment; replies: StoryComment[] };

type ReplyTarget = { threadId: string; commentId: string; name: string };

function buildThreads(comments: StoryComment[]): Thread[] {
  const threads = new Map<string, Thread>();
  for (const comment of comments) {
    if (!comment.parentId) threads.set(comment.id, { comment, replies: [] });
  }
  for (const comment of comments) {
    if (comment.parentId) threads.get(comment.parentId)?.replies.push(comment);
  }
  return [...threads.values()];
}

export function CommentsSection({
  storyId,
  displayName,
  onDisplayNameChange,
}: CommentsSectionProps) {
  const [name, setName] = useState(displayName);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchStoryComments(storyId)
      .then((next) => {
        if (!cancelled) {
          setComments(next);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const threads = useMemo(() => buildThreads(comments), [comments]);

  async function post(body: string, parentId: string | null) {
    const nextName = name.trim() || "Anonymous";
    const created = await postStoryComment(storyId, { displayName: nextName, body, parentId });
    setComments((prev) => [...prev, created]);
    if (nextName !== displayName) onDisplayNameChange(nextName);
  }

  return (
    <section className="border-t border-border px-6 py-5">
      <h2 className="mb-4 font-heading text-sm font-medium">
        Comments
        {comments.length > 0 ? (
          <span className="ml-1.5 text-muted-foreground tabular-nums">{comments.length}</span>
        ) : null}
      </h2>

      {loadError ? (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load comments</AlertTitle>
          <AlertDescription>Check your connection and try again.</AlertDescription>
        </Alert>
      ) : threads.length === 0 ? (
        <p className="mb-5 text-sm text-muted-foreground">No comments yet. Start the thread.</p>
      ) : (
        <ul className="mb-6 flex flex-col gap-5">
          {threads.map(({ comment, replies }) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={() =>
                  setReplyTarget({
                    threadId: comment.id,
                    commentId: comment.id,
                    name: comment.displayName,
                  })
                }
              />
              {replies.length > 0 || replyTarget?.threadId === comment.id ? (
                <div className="mt-3 ml-4 flex flex-col gap-4 border-l border-border pl-6">
                  {replies.length > 0 ? (
                    <ul className="flex flex-col gap-4">
                      {replies.map((reply) => (
                        <li key={reply.id}>
                          <CommentItem
                            comment={reply}
                            size="sm"
                            onReply={() =>
                              setReplyTarget({
                                threadId: comment.id,
                                commentId: reply.id,
                                name: reply.displayName,
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {replyTarget?.threadId === comment.id ? (
                    <Composer
                      // Remount when the target changes so the @mention prefill resets.
                      key={replyTarget.commentId}
                      id={`reply-${replyTarget.commentId}`}
                      label={`Reply to ${replyTarget.name}`}
                      initialBody={
                        replyTarget.commentId === comment.id ? "" : `@${replyTarget.name} `
                      }
                      placeholder={`Reply to ${replyTarget.name}…`}
                      submitLabel="Reply"
                      autoFocus
                      onCancel={() => setReplyTarget(null)}
                      onSubmit={async (body) => {
                        await post(body, replyTarget.commentId);
                        setReplyTarget(null);
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Composer
        id="comment-body"
        label="Add a comment"
        placeholder="Add to the discussion…"
        submitLabel="Post"
        onSubmit={(body) => post(body, null)}
        footer={
          <Field orientation="horizontal" className="w-auto gap-2">
            <FieldLabel
              htmlFor="comment-name"
              className="text-xs font-normal text-muted-foreground"
            >
              Posting as
            </FieldLabel>
            <Input
              id="comment-name"
              name="displayName"
              autoComplete="nickname"
              spellCheck={false}
              value={name}
              maxLength={40}
              placeholder="Anonymous"
              className="h-7 w-36 text-xs"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        }
      />
    </section>
  );
}

function CommentAvatar({ size = "default" }: { size?: "default" | "sm" }) {
  return (
    <Avatar size={size} aria-hidden="true">
      <AvatarFallback>
        <User className={size === "sm" ? "size-3.5" : "size-4"} />
      </AvatarFallback>
    </Avatar>
  );
}

function CommentItem({
  comment,
  size = "default",
  onReply,
}: {
  comment: StoryComment;
  size?: "default" | "sm";
  onReply: () => void;
}) {
  return (
    <article className="flex gap-3">
      <CommentAvatar size={size} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex items-baseline gap-1.5 text-xs">
          <span className="truncate font-medium text-foreground">{comment.displayName}</span>
          <span className="text-muted-foreground" aria-hidden="true">
            ·
          </span>
          <time dateTime={comment.createdAt} className="shrink-0 text-muted-foreground">
            {relativeTime(comment.createdAt)}
          </time>
        </p>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-pretty">
          {comment.body}
        </p>
        <div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="-ml-2 text-muted-foreground"
            onClick={onReply}
          >
            <Reply data-icon="inline-start" />
            Reply
          </Button>
        </div>
      </div>
    </article>
  );
}

type ComposerProps = {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  initialBody?: string;
  autoFocus?: boolean;
  footer?: React.ReactNode;
  onCancel?: () => void;
  onSubmit: (body: string) => Promise<void>;
};

function Composer({
  id,
  label,
  placeholder,
  submitLabel,
  initialBody = "",
  autoFocus = false,
  footer,
  onCancel,
  onSubmit,
}: ComposerProps) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  async function submit() {
    const trimmed = body.trim();
    if (posting || !trimmed) return;
    setPosting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setBody("");
    } catch {
      setError("Couldn't post. Check your connection and try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <form
      className="flex gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <CommentAvatar size={onCancel ? "sm" : "default"} />
      <Field data-invalid={error ? true : undefined} className="min-w-0 flex-1 gap-2">
        <FieldLabel htmlFor={id} className="sr-only">
          {label}
        </FieldLabel>
        <Textarea
          ref={textareaRef}
          id={id}
          name="body"
          value={body}
          maxLength={2000}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          className="min-h-16"
          onChange={(event) => {
            setBody(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            } else if (event.key === "Escape" && onCancel) {
              event.stopPropagation();
              onCancel();
            }
          }}
        />
        <FieldError>{error}</FieldError>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {footer ?? <span />}
          <div className="flex items-center gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={posting || !body.trim()}>
              {posting ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </div>
        </div>
      </Field>
    </form>
  );
}
