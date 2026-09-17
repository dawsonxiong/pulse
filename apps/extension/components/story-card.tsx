import { memo } from "react";
import { decodeHtmlEntities, usableStoryImage, type FeedStory } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pulse/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pulse/ui/components/collapsible";
import { cn } from "@pulse/ui/lib/utils";
import { Bookmark, ThumbsDown, ThumbsUp } from "lucide-react";
import { relativeTime } from "../lib/time";
import { SourceIcon } from "./source-icon";
import { Thumbnail } from "./thumbnail";

type StoryCardProps = {
  story: FeedStory;
  bookmarked: boolean;
  vote: "up" | "down" | null;
  priority?: boolean;
  onOpenStory: (story: FeedStory, postId?: string) => void;
  onToggleBookmark: (story: FeedStory) => void;
  onVote: (storyId: string, value: "up" | "down") => void;
};

function storyImage(story: FeedStory): string | null {
  return usableStoryImage(
    story.representative.imageUrl ?? story.posts.find((post) => post.imageUrl)?.imageUrl ?? null,
  );
}

export const StoryCard = memo(function StoryCard({
  story,
  bookmarked,
  vote,
  priority = false,
  onOpenStory,
  onToggleBookmark,
  onVote,
}: StoryCardProps) {
  const extra = story.posts.filter((post) => post.id !== story.representative.id);
  const clustered = story.sourceCount > 1 || extra.length > 0;
  const image = storyImage(story);

  return (
    <Card
      size="sm"
      className="h-full border border-border pt-0 ring-0 [content-visibility:auto] [contain-intrinsic-size:auto_24rem] hover:border-foreground/20"
    >
      <button
        type="button"
        className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-haspopup="dialog"
        onClick={() => onOpenStory(story)}
      >
        <Thumbnail
          key={image ?? "fallback"}
          src={image}
          iconUrl={story.representative.source.iconUrl}
          alt=""
          fallbackLabel={story.representative.source.name}
          priority={priority}
        />
        <CardHeader className="pt-4">
          <CardTitle className="line-clamp-3 min-w-0">
            {decodeHtmlEntities(story.representative.title)}
          </CardTitle>
        </CardHeader>
      </button>
      <CardContent className="flex flex-1 flex-col gap-2">
        <CardDescription className="flex items-center gap-1.5 text-xs text-foreground/55">
          <SourceIcon
            src={story.representative.source.iconUrl}
            label={story.representative.source.name}
          />
          <span className="min-w-0 truncate">
            {story.representative.source.name}
            <span aria-hidden="true"> · </span>
            {relativeTime(story.representative.publishedAt)}
          </span>
        </CardDescription>
        {clustered ? (
          <Collapsible>
            <CollapsibleTrigger
              render={
                <Button variant="ghost" size="xs" className="-ml-1.5 text-muted-foreground" />
              }
            >
              {story.sourceCount} sources
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-1 flex flex-col gap-1">
                {story.posts.map((post) => (
                  <li key={post.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="h-auto w-full justify-start text-left whitespace-normal"
                      aria-haspopup="dialog"
                      onClick={() => onOpenStory(story, post.id)}
                    >
                      <span className="line-clamp-2">{decodeHtmlEntities(post.title)}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Upvote"
          aria-label="Upvote"
          aria-pressed={vote === "up"}
          className={cn("hover:text-primary aria-pressed:bg-primary/15 aria-pressed:text-primary")}
          onClick={() => onVote(story.id, "up")}
        >
          <ThumbsUp className={vote === "up" ? "fill-current" : undefined} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Downvote"
          aria-label="Downvote"
          aria-pressed={vote === "down"}
          className={cn(
            "hover:text-destructive aria-pressed:bg-destructive/15 aria-pressed:text-destructive",
          )}
          onClick={() => onVote(story.id, "down")}
        >
          <ThumbsDown className={vote === "down" ? "fill-current" : undefined} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Save to reading list"
          aria-label="Save to reading list"
          aria-pressed={bookmarked}
          className="hover:text-primary aria-pressed:bg-muted aria-pressed:text-primary"
          onClick={() => onToggleBookmark(story)}
        >
          <Bookmark className={bookmarked ? "fill-current" : undefined} />
        </Button>
      </CardFooter>
    </Card>
  );
});
