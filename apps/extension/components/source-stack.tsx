import type { FeedSource, FeedStory } from "@pulse/shared";
import { cn } from "@pulse/ui/lib/utils";
import { iconToneClass, useIconCandidate } from "./source-icon";

const MAX_STACKED_ICONS = 3;

/** Every outlet covering a story, lead outlet first, each once. */
export function uniqueSources(story: FeedStory): FeedSource[] {
  const seen = new Set<string>();
  const sources: FeedSource[] = [];
  for (const post of [story.representative, ...story.posts]) {
    if (seen.has(post.source.id)) continue;
    seen.add(post.source.id);
    sources.push(post.source);
  }
  return sources;
}

/**
 * Overlapping icons for the outlets covering a story. `ringClassName` should
 * match the surface behind it so each icon reads as cut out of the next.
 */
export function SourceStack({
  sources,
  ringClassName = "ring-card",
}: {
  sources: FeedSource[];
  ringClassName?: string;
}) {
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {sources.slice(0, MAX_STACKED_ICONS).map((source, index) => (
        // Earlier outlets sit on top so the lead outlet's icon is never covered.
        <SourceAvatar
          key={source.id}
          source={source}
          zIndex={MAX_STACKED_ICONS - index}
          ringClassName={ringClassName}
        />
      ))}
    </span>
  );
}

function SourceAvatar({
  source,
  zIndex,
  ringClassName,
}: {
  source: FeedSource;
  zIndex: number;
  ringClassName: string;
}) {
  const icon = useIconCandidate(source.iconUrl, source.siteUrl);
  return (
    <span
      style={{ zIndex }}
      className={cn(
        "relative flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted ring-2",
        ringClassName,
      )}
    >
      {icon.src ? (
        <img
          src={icon.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("size-3.5 object-contain", iconToneClass(source.siteUrl))}
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
