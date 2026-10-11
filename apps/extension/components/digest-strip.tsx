import { decodeHtmlEntities, type Digest, type FeedStory } from "@pulse/shared";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pulse/ui/components/collapsible";
import { ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { iconToneClass, useIconCandidate } from "./source-icon";

type DigestStripProps = {
  digest: Digest;
  /** Whether this digest was shown on an earlier tab; seen digests start collapsed. */
  seen: boolean;
  onSeen: (digestId: string) => void;
  onOpenStory: (story: FeedStory) => void;
};

/**
 * AI-written brief above the feed. Kept visually apart from story cards and
 * marked with the sparkles icon so it never stands in for an author's headline.
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
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-x-8 gap-y-3 px-4 pb-4">
          {digest.items.map((item) => (
            <li
              key={item.text}
              className="border-l border-border pl-3 text-sm leading-relaxed text-pretty"
            >
              {item.text}
              <span className="ml-1.5 inline-flex translate-y-0.5 gap-1">
                {item.storyIds.map((id) => {
                  const story = storiesById.get(id);
                  return story ? <Citation key={id} story={story} onOpen={onOpenStory} /> : null;
                })}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Source icon standing in for a cited story; the original headline shows on hover. */
function Citation({ story, onOpen }: { story: FeedStory; onOpen: (story: FeedStory) => void }) {
  const source = story.representative.source;
  const icon = useIconCandidate(source.iconUrl, source.siteUrl);
  const title = decodeHtmlEntities(story.representative.title);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Open “${title}”`}
      title={`${source.name}: ${title}`}
      className="inline-flex size-5 cursor-pointer items-center justify-center rounded-md border border-border outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => onOpen(story)}
    >
      {icon.src ? (
        <img
          src={icon.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`size-3.5 rounded-sm object-contain ${iconToneClass(source.siteUrl)}`}
          onError={icon.onError}
        />
      ) : (
        <span aria-hidden className="text-[10px] font-medium text-muted-foreground">
          {source.name.charAt(0).toUpperCase()}
        </span>
      )}
    </button>
  );
}
