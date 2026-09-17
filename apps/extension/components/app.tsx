import {
  decodeHtmlEntities,
  decorateFeedStory,
  rankStories,
  TAG_BY_SLUG,
  type FeedStory,
  type RankableStory,
} from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@pulse/ui/components/empty";
import { Input } from "@pulse/ui/components/input";
import { toast } from "@pulse/ui/components/sonner";
import { Spinner } from "@pulse/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@pulse/ui/components/toggle-group";
import { Bookmark, Newspaper, RefreshCw, Search } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFeed } from "../lib/api";
import { cachedOrFixture, loadState, saveState, type LocalState } from "../lib/storage";
import {
  collectSources,
  EMPTY_FILTERS,
  filtersActive,
  storyMatchesFilters,
  type StoryFilters,
} from "../lib/filters";
import { FeedFilterButton, FeedFilterChips } from "./feed-filters";
import { Onboarding } from "./onboarding";
import { Sidebar } from "./sidebar";
import { StoryCard } from "./story-card";

const ReaderDialog = lazy(async () => {
  const mod = await import("./reader-dialog");
  return { default: mod.ReaderDialog };
});

type Ranked = RankableStory & { story: FeedStory };

function toggleVote(state: LocalState, storyId: string, value: "up" | "down"): LocalState {
  const current = state.votes.find((vote) => vote.storyId === storyId)?.value ?? null;
  const clearing = current === value;
  const votes = clearing
    ? state.votes.filter((vote) => vote.storyId !== storyId)
    : [...state.votes.filter((vote) => vote.storyId !== storyId), { storyId, value }];
  const hiddenStoryIds = state.hiddenStoryIds.filter((id) => id !== storyId);
  return { ...state, votes, hiddenStoryIds };
}

function feedHeading(view: "feed" | "reading-list", activeTag: string | null): string {
  if (view === "reading-list") return "Reading list";
  if (activeTag) return TAG_BY_SLUG.get(activeTag)?.label ?? activeTag;
  return "My feed";
}

function storyMatchesQuery(story: FeedStory, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystacks = [
    story.representative.title,
    story.representative.source.name,
    ...story.posts.flatMap((post) => [post.title, post.source.name]),
  ];
  return haystacks.some((value) => decodeHtmlEntities(value).toLowerCase().includes(needle));
}

function emptyCopy(
  view: "feed" | "reading-list",
  searching: boolean,
  filtering: boolean,
): { title: string; description: string } {
  if (searching || filtering) {
    return {
      title: "No matching stories",
      description: "Try a different search or clear filters.",
    };
  }
  if (view === "reading-list") {
    return { title: "Nothing saved yet", description: "Bookmark a story to add it here." };
  }
  return { title: "No stories yet", description: "No stories match these tags yet." };
}

export function App() {
  const [state, setState] = useState<LocalState | null>(null);
  const [stories, setStories] = useState<FeedStory[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<"feed" | "reading-list">("feed");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [reader, setReader] = useState<{ story: FeedStory; postId: string } | null>(null);
  const [filters, setFilters] = useState<StoryFilters>(EMPTY_FILTERS);
  const searchRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef(query);
  const mainRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    void loadState().then((loaded) => {
      if (cancelled) return;
      setState(loaded);
      setStories(cachedOrFixture(loaded));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tagKey = state?.tags.join(",") ?? "";

  const onboarded = state?.onboarded ?? false;

  const persistPage = useCallback((fresh: FeedStory[], cursor: string | null) => {
    nextCursorRef.current = cursor;
    setNextCursor(cursor);
    setStories(fresh);
    setState((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        feedCache: { fetchedAt: new Date().toISOString(), stories: fresh },
      };
      void saveState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!onboarded) return;
    let cancelled = false;
    const tags = tagKey.split(",").filter(Boolean);
    void fetchFeed(tags)
      .then((page) => {
        if (cancelled) return;
        persistPage(page.stories, page.nextCursor);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't refresh the feed");
      });
    return () => {
      cancelled = true;
    };
  }, [onboarded, persistPage, tagKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        if (queryRef.current) setQuery("");
        return;
      }
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleToggleBookmark = useCallback((story: FeedStory) => {
    setState((prev) => {
      if (!prev) return prev;
      const exists = prev.bookmarks.some((item) => item.storyId === story.id);
      const bookmarks = exists
        ? prev.bookmarks.filter((item) => item.storyId !== story.id)
        : [...prev.bookmarks, { storyId: story.id, savedAt: new Date().toISOString(), story }];
      const next = { ...prev, bookmarks };
      void saveState(next);
      if (exists) toast("Removed from reading list", { id: "pulse-action" });
      else toast.success("Saved to reading list", { id: "pulse-action" });
      return next;
    });
  }, []);

  const handleOpenStory = useCallback((story: FeedStory, postId?: string) => {
    setReader({ story, postId: postId ?? story.representative.id });
  }, []);

  const handleVote = useCallback((storyId: string, value: "up" | "down") => {
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.votes.find((vote) => vote.storyId === storyId)?.value ?? null;
      const next = toggleVote(prev, storyId, value);
      void saveState(next);
      if (current === value) toast("Vote removed", { id: "pulse-action" });
      else if (value === "up") toast.success("Upvoted", { id: "pulse-action" });
      else toast("Downvoted", { id: "pulse-action" });
      return next;
    });
  }, []);

  async function commit(next: LocalState) {
    setState(next);
    await saveState(next);
  }

  async function refreshFeed() {
    if (!state || refreshing) return;
    setRefreshing(true);
    try {
      const page = await fetchFeed(state.tags);
      persistPage(page.stories, page.nextCursor);
      toast.success("Feed updated", { id: "pulse-action" });
    } catch {
      toast.error("Couldn't refresh the feed");
    } finally {
      setRefreshing(false);
    }
  }

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (!cursor || loadingMoreRef.current || !tagKey) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const tags = tagKey.split(",").filter(Boolean);
      const page = await fetchFeed(tags, cursor);
      setStories((prev) => {
        const seen = new Set(prev.map((story) => story.id));
        return [...prev, ...page.stories.filter((story) => !seen.has(story.id))];
      });
      nextCursorRef.current = page.nextCursor;
      setNextCursor(page.nextCursor);
    } catch {
      toast.error("Couldn't load more stories");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [tagKey]);

  useEffect(() => {
    if (view !== "feed" || !nextCursor) return;
    const root = mainRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root, rootMargin: "480px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, nextCursor, stories.length, view]);

  const voteMap = useMemo(
    () => new Map((state?.votes ?? []).map((vote) => [vote.storyId, vote.value])),
    [state?.votes],
  );
  const bookmarkIds = useMemo(
    () => new Set((state?.bookmarks ?? []).map((item) => item.storyId)),
    [state?.bookmarks],
  );

  const userTags = state?.tags;
  const sort = state?.sort ?? "for-you";

  const ranked = useMemo(() => {
    if (!userTags) return [];
    const items: Ranked[] = stories.map((story) => ({
      id: story.id,
      publishedAt: new Date(story.publishedAt),
      tags: story.tags,
      sourceAuthority: story.sourceAuthority,
      upvotes: voteMap.get(story.id) === "up" ? 1 : 0,
      story,
    }));
    return rankStories(items, userTags, new Date());
  }, [stories, userTags, voteMap]);

  const ordered = useMemo(() => {
    if (sort === "for-you") return ranked;
    return [...ranked].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }, [ranked, sort]);

  if (!state) {
    return (
      <Empty className="min-h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Loading…</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!state.onboarded || editingTags) {
    return (
      <Onboarding
        selected={state.tags}
        editing={editingTags}
        onChange={(tags) => {
          void commit({ ...state, tags });
        }}
        onContinue={() => {
          if (state.tags.length < 5) return;
          const updating = editingTags;
          setEditingTags(false);
          void commit({ ...state, onboarded: true });
          if (updating) toast.success("Tags updated");
        }}
      />
    );
  }

  const catalogStories =
    view === "reading-list"
      ? state.bookmarks.map((item) => decorateFeedStory(item.story))
      : ordered.map((item) => decorateFeedStory(item.story));
  const taggedStories =
    view !== "feed" || !activeTag
      ? catalogStories
      : catalogStories.filter((story) => story.tags.includes(activeTag));
  const filterNow = new Date();
  const visibleStories = taggedStories.filter(
    (story) => storyMatchesQuery(story, query) && storyMatchesFilters(story, filters, filterNow),
  );
  const sources = collectSources(taggedStories);
  const searching = query.trim().length > 0;
  const filtering = filtersActive(filters);
  const empty = emptyCopy(view, searching, filtering);

  return (
    <div className="pulse-glow flex h-full bg-background">
      <a
        href="#feed-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:ring-3 focus:ring-ring/50"
      >
        Skip to feed
      </a>
      <Sidebar
        view={view}
        tags={state.tags}
        activeTag={view === "feed" ? activeTag : null}
        bookmarkCount={state.bookmarks.length}
        onView={(next) => {
          setView(next);
          setActiveTag(null);
        }}
        onEditTags={() => setEditingTags(true)}
        onFilterTag={(slug) => {
          setView("feed");
          setActiveTag((current) => (current === slug ? null : slug));
        }}
      />
      <main
        id="feed-main"
        ref={mainRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="font-heading text-lg font-medium tracking-tight">
                {feedHeading(view, activeTag)}
              </h1>
              {view === "feed" ? (
                <ToggleGroup
                  size="sm"
                  variant="outline"
                  spacing={0}
                  value={[state.sort]}
                  aria-label="Sort"
                  onValueChange={(value) => {
                    const next = value[0];
                    if (next !== "for-you" && next !== "latest") return;
                    void commit({ ...state, sort: next });
                  }}
                >
                  <ToggleGroupItem value="for-you">For you</ToggleGroupItem>
                  <ToggleGroupItem value="latest">Latest</ToggleGroupItem>
                </ToggleGroup>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <FeedFilterButton filters={filters} sources={sources} onChange={setFilters} />
              <Input
                ref={searchRef}
                id="feed-search"
                name="q"
                type="search"
                autoComplete="off"
                value={query}
                placeholder="Search…"
                aria-label="Search stories"
                className="h-8 w-44 md:w-56"
                onChange={(event) => setQuery(event.target.value)}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                title="Refresh"
                aria-label="Refresh feed"
                aria-busy={refreshing}
                disabled={refreshing}
                onClick={() => void refreshFeed()}
              >
                {refreshing ? <Spinner /> : <RefreshCw />}
              </Button>
            </div>
          </div>
          <FeedFilterChips filters={filters} sources={sources} onChange={setFilters} />
        </div>
        {visibleStories.length === 0 ? (
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {view === "reading-list" ? (
                  <Bookmark />
                ) : searching || filtering ? (
                  <Search />
                ) : (
                  <Newspaper />
                )}
              </EmptyMedia>
              <EmptyTitle>{empty.title}</EmptyTitle>
              <EmptyDescription>{empty.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleStories.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                bookmarked={bookmarkIds.has(story.id)}
                vote={voteMap.get(story.id) ?? null}
                priority={index < 4}
                onOpenStory={handleOpenStory}
                onToggleBookmark={handleToggleBookmark}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
        {view === "feed" && (nextCursor || loadingMore) ? (
          <div
            ref={sentinelRef}
            className="flex justify-center py-4"
            aria-hidden={!loadingMore}
          >
            {loadingMore ? <Spinner className="size-5" /> : null}
          </div>
        ) : null}
      </main>
      <Suspense fallback={null}>
        <ReaderDialog
          story={reader?.story ?? null}
          postId={reader?.postId ?? null}
          displayName={state.displayName}
          onDisplayNameChange={(name) => void commit({ ...state, displayName: name })}
          onClose={() => setReader(null)}
        />
      </Suspense>
    </div>
  );
}
