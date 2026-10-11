import { decodeHtmlEntities, type Digest, type FeedSource, type FeedStory } from "@pulse/shared";
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
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-x-8 gap-y-4 px-4 pb-4">
          {digest.items.map((item, index) => (
            <li key={item.text} className="flex gap-3">
              <span
                aria-hidden
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums ring-1 ring-primary/30"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-sm leading-relaxed text-pretty">{item.text}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.storyIds.map((id) => {
                    const story = storiesById.get(id);
                    return story ? <Citation key={id} story={story} onOpen={onOpenStory} /> : null;
                  })}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

const MAX_STACKED_ICONS = 3;

function uniqueSources(story: FeedStory): FeedSource[] {
  const seen = new Set<string>();
  const sources: FeedSource[] = [];
  for (const post of [story.representative, ...story.posts]) {
    if (seen.has(post.source.id)) continue;
    seen.add(post.source.id);
    sources.push(post.source);
  }
  return sources;
}

/** A cited story: stacked icons for every outlet covering it, then the lead outlet's name. */
function Citation({ story, onOpen }: { story: FeedStory; onOpen: (story: FeedStory) => void }) {
  const sources = uniqueSources(story);
  const lead = sources[0] ?? story.representative.source;
  const extra = sources.length - 1;
  const title = decodeHtmlEntities(story.representative.title);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Open “${title}”`}
      title={title}
      className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-border py-0.5 pr-2.5 pl-0.5 text-xs text-muted-foreground outline-none hover:border-foreground/25 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => onOpen(story)}
    >
      <span className="flex shrink-0 -space-x-1.5">
        {sources.slice(0, MAX_STACKED_ICONS).map((source, index) => (
          // Earlier outlets sit on top so the lead outlet's icon is never covered.
          <SourceAvatar key={source.id} source={source} zIndex={MAX_STACKED_ICONS - index} />
        ))}
      </span>
      <span className="truncate">{lead.name}</span>
      {extra > 0 ? <span className="shrink-0 tabular-nums">+{extra}</span> : null}
    </button>
  );
}

function SourceAvatar({ source, zIndex }: { source: FeedSource; zIndex: number }) {
  const icon = useIconCandidate(source.iconUrl, source.siteUrl);
  return (
    <span
      style={{ zIndex }}
      className="relative flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-card"
    >
      {icon.src ? (
        <img
          src={icon.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`size-3.5 object-contain ${iconToneClass(source.siteUrl)}`}
          onError={icon.onError}
        />
      ) : (
        <span aria-hidden className="text-[10px] font-medium">
          {source.name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
