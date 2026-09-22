import {
  decodeHtmlEntities,
  type FeedPost,
  type FeedStory,
  type StoryArticle,
  type StoryComment,
} from "@pulse/shared";
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/components/alert";
import { Button } from "@pulse/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@pulse/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@pulse/ui/components/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@pulse/ui/components/field";
import { Input } from "@pulse/ui/components/input";
import { Spinner } from "@pulse/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pulse/ui/components/tabs";
import { Textarea } from "@pulse/ui/components/textarea";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStoryArticle, fetchStoryComments, postStoryComment } from "../lib/api";
import { relativeTime } from "../lib/time";
import { SourceIcon } from "./source-icon";

type ReaderDialogProps = {
  story: FeedStory | null;
  postId: string | null;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onClose: () => void;
};

function selectedPost(story: FeedStory, postId: string): FeedPost {
  return story.posts.find((item) => item.id === postId) ?? story.representative;
}

export function ReaderDialog({
  story,
  postId,
  displayName,
  onDisplayNameChange,
  onClose,
}: ReaderDialogProps) {
  return (
    <Dialog
      open={story !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="h-[min(92vh,52rem)] w-[min(94vw,46rem)] max-w-[46rem] p-0 sm:max-w-[46rem]"
        showCloseButton
      >
        {story && postId ? (
          <ReaderBody
            key={`${story.id}:${postId}`}
            story={story}
            post={selectedPost(story, postId)}
            displayName={displayName}
            onDisplayNameChange={onDisplayNameChange}
          />
        ) : (
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Story</DialogTitle>
            <DialogDescription>The story reader is closed.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ReaderBodyProps = {
  story: FeedStory;
  post: FeedPost;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
};

function ReaderBody({ story, post, displayName, onDisplayNameChange }: ReaderBodyProps) {
  const [tab, setTab] = useState("summary");
  const [name, setName] = useState(displayName);
  const [article, setArticle] = useState<StoryArticle | null>(null);
  const [articleError, setArticleError] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentsError, setCommentsError] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (tab !== "article") return;
    let cancelled = false;
    void fetchStoryArticle(story.id, post.id)
      .then((next) => {
        if (!cancelled) {
          setArticle(next);
          setArticleError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setArticleError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [story.id, post.id, tab]);

  useEffect(() => {
    let cancelled = false;
    void fetchStoryComments(story.id)
      .then((next) => {
        if (!cancelled) {
          setComments(next);
          setCommentsError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCommentsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [story.id]);

  const title = decodeHtmlEntities(post.title);
  const excerpt = post.excerpt
    ? decodeHtmlEntities(post.excerpt)
    : article?.excerpt
      ? decodeHtmlEntities(article.excerpt)
      : null;

  function persistName(nextName: string) {
    const next = nextName.trim() || "Anonymous";
    if (next !== displayName) onDisplayNameChange(next);
  }

  async function submitComment() {
    if (posting) return;
    const body = commentBody.trim();
    const nextName = name.trim() || "Anonymous";
    if (!body) return;
    setPosting(true);
    setCommentError(null);
    try {
      const created = await postStoryComment(story.id, { displayName: nextName, body });
      setComments((prev) => [...prev, created]);
      setCommentBody("");
      persistName(nextName);
    } catch {
      setCommentError("Couldn't post. Check your connection and try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="gap-2.5 px-6 pt-6 pb-4">
        <DialogTitle className="text-balance pr-8 leading-snug">{title}</DialogTitle>
        <DialogDescription className="flex items-center gap-2">
          <SourceIcon src={post.source.iconUrl} label={post.source.name} />
          <span>
            {post.source.name}
            <span aria-hidden="true"> · </span>
            {relativeTime(post.publishedAt)}
          </span>
        </DialogDescription>
      </DialogHeader>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (typeof value === "string") setTab(value);
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 pb-3">
          <TabsList>
            <TabsTrigger value="summary" className="px-2.5">
              Summary
            </TabsTrigger>
            <TabsTrigger value="article" className="px-2.5">
              Article
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={post.url} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink data-icon="inline-start" />
            Original
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="summary" className="px-6 py-5">
            {excerpt ? (
              <p className="text-[0.925rem] leading-7 text-pretty">{excerpt}</p>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No summary available.</EmptyTitle>
                  <EmptyDescription>Open the page to read the article.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </TabsContent>
          <TabsContent value="article" className="px-6 py-5" aria-busy={!article && !articleError}>
            {articleError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Couldn&apos;t extract this page</AlertTitle>
                <AlertDescription>
                  Use Original to read it on the publisher&apos;s site.
                </AlertDescription>
              </Alert>
            ) : !article ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Spinner />
                  </EmptyMedia>
                  <EmptyTitle>Loading article…</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : article.html ? (
              <div
                className="reader-prose"
                dangerouslySetInnerHTML={{ __html: article.html }}
              />
            ) : article.excerpt ? (
              <p className="text-sm leading-relaxed text-pretty">
                {decodeHtmlEntities(article.excerpt)}
              </p>
            ) : (
              <Alert>
                <AlertCircle />
                <AlertTitle>This page couldn&apos;t be unwrapped here</AlertTitle>
                <AlertDescription>
                  Use Original to read it on the publisher&apos;s site.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          <section className="border-t border-border px-6 py-5">
            <h2 className="mb-4 font-heading text-sm font-medium">Comments</h2>
            {commentsError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle />
                <AlertTitle>Couldn&apos;t load comments</AlertTitle>
                <AlertDescription>Check your connection and try again.</AlertDescription>
              </Alert>
            ) : comments.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="mb-4 flex flex-col gap-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">
                      {comment.displayName}
                      <span aria-hidden="true"> · </span>
                      {relativeTime(comment.createdAt)}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment();
              }}
            >
              <FieldGroup className="gap-2">
                <Field>
                  <FieldLabel htmlFor="comment-name">Display name</FieldLabel>
                  <Input
                    id="comment-name"
                    name="displayName"
                    autoComplete="nickname"
                    spellCheck={false}
                    value={name}
                    maxLength={40}
                    placeholder="Ada…"
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field data-invalid={commentError ? true : undefined}>
                  <FieldLabel htmlFor="comment-body">Comment</FieldLabel>
                  <Textarea
                    id="comment-body"
                    name="body"
                    value={commentBody}
                    maxLength={2000}
                    placeholder="Write a comment…"
                    aria-invalid={commentError ? true : undefined}
                    className="min-h-20"
                    onChange={(event) => {
                      setCommentBody(event.target.value);
                      if (commentError) setCommentError(null);
                    }}
                  />
                  <FieldError>{commentError}</FieldError>
                </Field>
                <Button type="submit" className="self-end" disabled={posting}>
                  {posting ? <Spinner data-icon="inline-start" /> : null}
                  Post
                </Button>
              </FieldGroup>
            </form>
          </section>
        </div>
      </Tabs>
    </div>
  );
}
