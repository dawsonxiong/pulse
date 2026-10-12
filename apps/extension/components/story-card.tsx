import { memo } from "react";
import { decodeHtmlEntities, usableStoryImage, type FeedStory } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pulse/ui/components/collapsible";
import { cn } from "@pulse/ui/lib/utils";
import { Bookmark, ChevronDown, ThumbsDown, ThumbsUp } from "lucide-react";
import { relativeTime } from "../lib/time";
import { SourceStack, uniqueSources } from "./source-stack";
import { Thumbnail } from "./thumbnail";

type StoryCardProps = {
  story: FeedStory;
  bookmarked: boolean;
  vote: "up" | "down" | null;
  /**
   * "lead" is a large card for the top stories: big image, headline and
   * excerpt. "row" is a compact line for scanning the rest of the feed.
   */
  variant?: "lead" | "row";
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

/** Publisher art is often bright white; tone it down slightly so it doesn't glare on the dark UI. */
const DIMMED_IMAGE = "[&_img]:brightness-[.92]";

export const StoryCard = memo(function StoryCard({
  story,
  bookmarked,
  vote,
  variant = "row",
  priority = false,
  onOpenStory,
  onToggleBookmark,
  onVote,
}: StoryCardProps) {
  const image = storyImage(story);
  const title = decodeHtmlEntities(story.representative.title);
  const lead = variant === "lead";

  const thumbnail = (
    <Thumbnail
      key={image ?? "fallback"}
      src={image}
      iconUrl={story.representative.source.iconUrl}
      siteUrl={story.representative.source.siteUrl}
      alt=""
      fallbackLabel={story.representative.source.name}
      priority={priority}
      className={cn(
        "aspect-[1200/630] ring-2 ring-border",
        lead ? "w-full rounded-lg" : "w-full rounded-md",
        DIMMED_IMAGE,
      )}
    />
  );

  const meta = (
    <div className="flex min-w-0 items-center gap-2">
      <Coverage story={story} onOpenStory={onOpenStory} />
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {relativeTime(story.representative.publishedAt)}
      </span>
      <StoryActions
        story={story}
        bookmarked={bookmarked}
        vote={vote}
        onToggleBookmark={onToggleBookmark}
        onVote={onVote}
      />
    </div>
  );

  if (lead) {
    // Stacked on narrow screens; image beside the text on wide ones, so two leads
    // stay short without cropping the og-ratio art.
    return (
      <article className="group/story flex flex-col gap-3 xl:flex-row xl:gap-4">
        {/* The image repeats the title button's action, so it stays out of the tab order. */}
        <button
          type="button"
          className="cursor-pointer self-start rounded-lg border-0 bg-transparent p-0 outline-none w-full xl:w-[46%] xl:shrink-0"
          aria-hidden
          tabIndex={-1}
          onClick={() => onOpenStory(story)}
        >
          {thumbnail}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <button
            type="button"
            className="flex cursor-pointer flex-col gap-2 rounded-sm border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-haspopup="dialog"
            onClick={() => onOpenStory(story)}
          >
            <h2 className="font-heading text-[1.375rem] leading-tight font-semibold tracking-tight text-balance">
              {title}
            </h2>
            {story.representative.excerpt ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {decodeHtmlEntities(story.representative.excerpt)}
              </p>
            ) : null}
          </button>
          {meta}
        </div>
      </article>
    );
  }

  // The thumbnail sits on the right so every headline starts on the same left edge.
  return (
    <article className="group/story flex items-start gap-4 border-b border-border/60 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <button
          type="button"
          className="cursor-pointer rounded-sm border-0 bg-transparent p-0 text-left text-inherit outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-haspopup="dialog"
          onClick={() => onOpenStory(story)}
        >
          <h3 className="line-clamp-2 text-[0.9375rem] leading-snug font-medium text-pretty">
            {title}
          </h3>
        </button>
        {meta}
      </div>
      {/* The image repeats the title button's action, so it stays out of the tab order. */}
      <button
        type="button"
        className="w-28 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0 outline-none"
        aria-hidden
        tabIndex={-1}
        onClick={() => onOpenStory(story)}
      >
        {thumbnail}
      </button>
    </article>
  );
});

/**
 * Who covered the story. A single outlet is just its name; several outlets
 * stack their icons and expand into the list of each outlet's version.
 */
function Coverage({
  story,
  onOpenStory,
}: {
  story: FeedStory;
  onOpenStory: (story: FeedStory, postId?: string) => void;
}) {
  const sources = uniqueSources(story);
  const leadSource = sources[0] ?? story.representative.source;
  const others = Math.max(story.sourceCount, sources.length) - 1;

  const label = (
    <>
      <SourceStack sources={sources} ringClassName="ring-background" />
      <span className="truncate">{leadSource.name}</span>
    </>
  );

  if (others <= 0) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {label}
      </span>
    );
  }

  return (
    <Collapsible className="min-w-0">
      <CollapsibleTrigger
        className="group/coverage flex min-w-0 cursor-pointer items-center gap-1.5 rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`${leadSource.name} and ${others} more ${others === 1 ? "outlet" : "outlets"}`}
      >
        {label}
        <span className="shrink-0 font-medium text-foreground/80 tabular-nums">+{others}</span>
        <ChevronDown
          aria-hidden
          className="size-3 shrink-0 transition-transform group-data-[panel-open]/coverage:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 flex flex-col gap-1 border-l border-border pl-3">
          {story.posts.map((post) => (
            <li key={post.id}>
              <button
                type="button"
                className="flex w-full min-w-0 cursor-pointer gap-1.5 rounded-sm text-left text-xs leading-relaxed text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-haspopup="dialog"
                onClick={() => onOpenStory(story, post.id)}
              >
                <span className="shrink-0 text-foreground/80">{post.source.name}</span>
                <span className="truncate">{decodeHtmlEntities(post.title)}</span>
              </button>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Vote and save. Hidden until the story is hovered or focused, except on
 * touch screens and when one of them is already active.
 */
function StoryActions({
  story,
  bookmarked,
  vote,
  onToggleBookmark,
  onVote,
}: Pick<StoryCardProps, "story" | "bookmarked" | "vote" | "onToggleBookmark" | "onVote">) {
  const active = bookmarked || vote !== null;
  return (
    <div
      className={cn(
        "ml-auto flex shrink-0 items-center gap-0.5 transition-opacity",
        active
          ? "opacity-100"
          : "opacity-0 group-focus-within/story:opacity-100 group-hover/story:opacity-100 [@media(hover:none)]:opacity-100",
      )}
    >
      <Button
        variant="ghost"
        size="icon-xs"
        title="Upvote"
        aria-label="Upvote"
        aria-pressed={vote === "up"}
        className="text-muted-foreground hover:text-primary aria-pressed:text-primary"
        onClick={() => onVote(story.id, "up")}
      >
        <ThumbsUp className={vote === "up" ? "fill-current" : undefined} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title="Downvote"
        aria-label="Downvote"
        aria-pressed={vote === "down"}
        className="text-muted-foreground hover:text-destructive aria-pressed:text-destructive"
        onClick={() => onVote(story.id, "down")}
      >
        <ThumbsDown className={vote === "down" ? "fill-current" : undefined} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={bookmarked ? "Remove from reading list" : "Save to reading list"}
        aria-label={bookmarked ? "Remove from reading list" : "Save to reading list"}
        aria-pressed={bookmarked}
        className="text-muted-foreground hover:text-primary aria-pressed:text-primary"
        onClick={() => onToggleBookmark(story)}
      >
        <Bookmark className={bookmarked ? "fill-current" : undefined} />
      </Button>
    </div>
  );
}
