import {
  decodeHtmlEntities,
  type Digest,
  type DigestItem,
  type FeedSource,
  type FeedStory,
} from "@pulse/shared";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@pulse/ui/components/collapsible";
import { ChevronDown, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { streamDigestChat, type ChatSender } from "../lib/api";
import { ChatThread, useChat } from "./chat-thread";
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
  // Owned here, not in the collapsible panel, so collapsing keeps the conversation.
  const sendChat = useCallback<ChatSender>(
    (messages, onDelta, signal) => streamDigestChat(digest.id, messages, onDelta, signal),
    [digest.id],
  );
  const chat = useChat(sendChat, "This brief is no longer available. Refresh to get today's.");
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
        {/* Wide screens: bullets left, chat panel right (matching the bullets' height and
            scrolling inside). Narrower: chat stacked under the bullets. */}
        <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          <ol className="grid content-start grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-x-8 gap-y-4 px-4 pb-4">
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
                      return story ? (
                        <Citation key={id} story={story} onOpen={onOpenStory} />
                      ) : null;
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mx-4 mb-4 border-t border-border pt-4 xl:relative xl:mx-0 xl:min-h-72 xl:border-t-0 xl:border-l xl:pt-0">
            {/* Stacked: indented to the bullets' text column (circle 1.5rem + gap 0.75rem). */}
            <div className="pl-9 xl:absolute xl:inset-0 xl:flex xl:flex-col xl:px-4">
              <ChatThread
                variant="compact"
                chat={chat}
                intro="Ask about today's brief. Answers come from the stories it cites."
                starters={BRIEF_STARTERS}
                label="Ask about today's brief"
                placeholder="Ask about today's brief…"
                className="xl:min-h-0"
                listClassName="max-h-80 overflow-y-auto pr-2 xl:max-h-none xl:min-h-0 xl:flex-1"
                renderAnswer={(text) =>
                  withBulletBadges(text, digest.items, storiesById, onOpenStory)
                }
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const BRIEF_STARTERS = [
  "What matters most today?",
  "Anything I should act on?",
  "How do these stories connect?",
];

/** Renders "(2)" style bullet references in an answer as the brief's numbered badges. */
function withBulletBadges(
  text: string,
  items: DigestItem[],
  storiesById: Map<string, FeedStory>,
  onOpenStory: (story: FeedStory) => void,
): ReactNode[] {
  let offset = 0;
  return text.split(/(\(\d\))/).map((part) => {
    const at = offset;
    offset += part.length;
    const match = /^\((\d)\)$/.exec(part);
    const bullet = match ? Number(match[1]) : 0;
    const storyId = items[bullet - 1]?.storyIds[0];
    const story = storyId ? storiesById.get(storyId) : undefined;
    if (!story) return part;
    const title = decodeHtmlEntities(story.representative.title);
    // Opens the bullet's lead story in the reader, like a citation chip.
    return (
      <button
        key={at}
        type="button"
        aria-haspopup="dialog"
        aria-label={`Open bullet ${bullet}: “${title}”`}
        title={title}
        className="mx-0.5 inline-flex size-[1.15rem] -translate-y-px cursor-pointer items-center justify-center rounded-full bg-primary/10 align-middle text-[0.65rem] font-semibold text-primary tabular-nums ring-1 ring-primary/30 outline-none hover:bg-primary/25 focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpenStory(story)}
      >
        {bullet}
      </button>
    );
  });
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
