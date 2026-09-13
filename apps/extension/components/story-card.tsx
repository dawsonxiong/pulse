import type { FeedStory } from "@pulse/shared";
import { Button, buttonVariants } from "@pulse/ui/components/button";
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
  onToggleBookmark: () => void;
  onVote: (value: "up" | "down") => void;
};

function storyImage(story: FeedStory): string | null {
  return (
    story.representative.imageUrl ?? story.posts.find((post) => post.imageUrl)?.imageUrl ?? null
  );
}

const actionButtonClass =
  "transition-none hover:bg-muted hover:text-foreground dark:hover:bg-muted active:translate-y-0 aria-pressed:bg-muted aria-pressed:text-primary";

export function StoryCard({ story, bookmarked, vote, onToggleBookmark, onVote }: StoryCardProps) {
  const extra = story.posts.filter((post) => post.id !== story.representative.id);
  const clustered = story.sourceCount > 1 || extra.length > 0;
  const href = story.representative.url;

  return (
    <Card size="sm" className="h-full pt-0">
      <a href={href} target="_blank" rel="noreferrer" className="block">
        <Thumbnail
          src={storyImage(story)}
          alt=""
          fallbackLabel={story.representative.source.name}
        />
        <CardHeader className="pt-4">
          <CardTitle className="line-clamp-3">{story.representative.title}</CardTitle>
        </CardHeader>
      </a>
      <CardContent className="flex flex-1 flex-col gap-2">
        <CardDescription className="flex items-center gap-1.5">
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
              className={cn(
                buttonVariants({ variant: "ghost", size: "xs" }),
                "-ml-1.5 text-muted-foreground",
              )}
            >
              {story.sourceCount} sources
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-1 flex flex-col gap-1">
                {story.posts.map((post) => (
                  <li key={post.id}>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-xs text-foreground hover:underline"
                    >
                      {post.title}
                    </a>
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
          size="icon-xs"
          aria-label="Upvote"
          aria-pressed={vote === "up"}
          className={actionButtonClass}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onVote("up");
          }}
        >
          <ThumbsUp className={vote === "up" ? "fill-current" : undefined} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Downvote"
          aria-pressed={vote === "down"}
          className={actionButtonClass}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onVote("down");
          }}
        >
          <ThumbsDown className={vote === "down" ? "fill-current" : undefined} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Bookmark"
          aria-pressed={bookmarked}
          className={actionButtonClass}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleBookmark();
          }}
        >
          <Bookmark className={bookmarked ? "fill-current" : undefined} />
        </Button>
      </CardFooter>
    </Card>
  );
}
