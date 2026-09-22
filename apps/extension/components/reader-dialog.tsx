import {
  decodeHtmlEntities,
  type FeedPost,
  type FeedStory,
  type StoryArticle,
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
import { Spinner } from "@pulse/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pulse/ui/components/tabs";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStoryArticle } from "../lib/api";
import { relativeTime } from "../lib/time";
import { CommentsSection } from "./comments-section";
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
  const [article, setArticle] = useState<StoryArticle | null>(null);
  const [articleError, setArticleError] = useState(false);

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

  const title = decodeHtmlEntities(post.title);
  const excerpt = post.excerpt
    ? decodeHtmlEntities(post.excerpt)
    : article?.excerpt
      ? decodeHtmlEntities(article.excerpt)
      : null;

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
              <div className="reader-prose" dangerouslySetInnerHTML={{ __html: article.html }} />
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
          <CommentsSection
            storyId={story.id}
            displayName={displayName}
            onDisplayNameChange={onDisplayNameChange}
          />
        </div>
      </Tabs>
    </div>
  );
}
