import { decodeHtmlEntities, type Digest, type FeedStory } from "@pulse/shared";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pulse/ui/components/collapsible";
import { ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { relativeTime } from "../lib/time";

type DigestStripProps = {
  digest: Digest;
  /** Whether this digest was shown on an earlier tab; seen digests start collapsed. */
  seen: boolean;
  onSeen: (digestId: string) => void;
  onOpenStory: (story: FeedStory) => void;
};

/**
 * AI-written brief above the feed. Kept visually apart from story cards and
 * labeled as AI so it never stands in for an author's headline.
 */
export function DigestStrip({ digest, seen, onSeen, onOpenStory }: DigestStripProps) {
  const [open, setOpen] = useState(!seen);
  const storiesById = useMemo(
    () => new Map(digest.stories.map((story) => [story.id, story])),
    [digest.stories],
  );

  useEffect(() => {
    if (!seen) onSeen(digest.id);
  }, [digest.id, onSeen, seen]);

  const first = digest.items[0];

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-card/60 text-card-foreground"
    >
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="shrink-0 font-heading text-sm font-medium">Today's brief</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          AI summary · {relativeTime(digest.generatedAt)}
        </span>
        {!open && first ? (
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {first.text}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-3 px-4 pb-4">
          {digest.items.map((item) => (
            <li key={item.text} className="flex flex-col gap-1.5 text-sm leading-relaxed">
              <p>{item.text}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.storyIds.map((id) => {
                  const story = storiesById.get(id);
                  if (!story) return null;
                  const title = decodeHtmlEntities(story.representative.title);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-haspopup="dialog"
                      title={title}
                      className="max-w-64 cursor-pointer truncate rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground outline-none hover:border-foreground/20 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={() => onOpenStory(story)}
                    >
                      {title}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
