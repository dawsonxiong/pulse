import { rankStories, TAG_BY_SLUG, type FeedStory, type RankableStory } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { toast } from "@pulse/ui/components/sonner";
import { useEffect, useMemo, useState } from "react";
import { fetchFeed } from "../lib/api";
import { cachedOrFixture, loadState, saveState, type LocalState } from "../lib/storage";
import { Onboarding } from "./onboarding";
import { Sidebar } from "./sidebar";
import { StoryCard } from "./story-card";

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

export function App() {
  const [state, setState] = useState<LocalState | null>(null);
  const [stories, setStories] = useState<FeedStory[]>([]);
  const [view, setView] = useState<"feed" | "reading-list">("feed");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);

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

  useEffect(() => {
    if (!onboarded) return;
    let cancelled = false;
    const tags = tagKey.split(",").filter(Boolean);
    void fetchFeed(tags)
      .then((fresh) => {
        if (cancelled) return;
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
      })
      .catch(() => {
        toast.error("Couldn't refresh the feed");
      });
    return () => {
      cancelled = true;
    };
  }, [onboarded, tagKey]);

  async function commit(next: LocalState) {
    setState(next);
    await saveState(next);
  }

  const ranked = useMemo(() => {
    if (!state) return [];
    const voteMap = new Map(state.votes.map((vote) => [vote.storyId, vote.value]));
    const items: Ranked[] = stories.map((story) => ({
      id: story.id,
      publishedAt: new Date(story.publishedAt),
      tags: story.tags,
      sourceAuthority: story.sourceAuthority,
      upvotes: voteMap.get(story.id) === "up" ? 1 : 0,
      story,
    }));
    return rankStories(items, state.tags, new Date());
  }, [stories, state]);

  const ordered = useMemo(() => {
    if (!state || state.sort === "for-you") return ranked;
    return [...ranked].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }, [ranked, state]);

  if (!state) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!state.onboarded || editingTags) {
    return (
      <Onboarding
        selected={state.tags}
        editing={editingTags}
        onToggle={(slug) => {
          const tags = state.tags.includes(slug)
            ? state.tags.filter((item) => item !== slug)
            : [...state.tags, slug];
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

  const visibleStories = (() => {
    const base =
      view === "reading-list"
        ? state.bookmarks.map((item) => item.story)
        : ordered.map((item) => item.story);
    if (view !== "feed" || !activeTag) return base;
    return base.filter((story) => story.tags.includes(activeTag));
  })();

  return (
    <div className="pulse-glow flex min-h-full bg-background">
      <Sidebar
        view={view}
        tags={state.tags}
        activeTag={view === "feed" ? activeTag : null}
        bookmarkCount={state.bookmarks.length}
        onView={(next) => {
          setView(next);
          if (next !== "feed") setActiveTag(null);
        }}
        onEditTags={() => setEditingTags(true)}
        onFilterTag={(slug) => {
          setView("feed");
          setActiveTag((current) => (current === slug ? null : slug));
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-lg font-medium tracking-tight">
            {feedHeading(view, activeTag)}
          </h1>
          {view === "feed" ? (
            <div className="flex rounded-lg border border-border p-0.5">
              <Button
                size="xs"
                variant={state.sort === "for-you" ? "secondary" : "ghost"}
                className="transition-none active:translate-y-0 active:not-aria-[haspopup]:translate-y-0"
                aria-pressed={state.sort === "for-you"}
                onClick={() => void commit({ ...state, sort: "for-you" })}
              >
                For you
              </Button>
              <Button
                size="xs"
                variant={state.sort === "latest" ? "secondary" : "ghost"}
                className="transition-none active:translate-y-0 active:not-aria-[haspopup]:translate-y-0"
                aria-pressed={state.sort === "latest"}
                onClick={() => void commit({ ...state, sort: "latest" })}
              >
                Latest
              </Button>
            </div>
          ) : null}
        </div>
        {visibleStories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {view === "reading-list" ? "Nothing saved yet." : "No stories match these tags yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                bookmarked={state.bookmarks.some((item) => item.storyId === story.id)}
                vote={state.votes.find((item) => item.storyId === story.id)?.value ?? null}
                onToggleBookmark={() => {
                  const exists = state.bookmarks.some((item) => item.storyId === story.id);
                  const bookmarks = exists
                    ? state.bookmarks.filter((item) => item.storyId !== story.id)
                    : [
                        ...state.bookmarks,
                        { storyId: story.id, savedAt: new Date().toISOString(), story },
                      ];
                  void commit({ ...state, bookmarks });
                  if (exists) toast("Removed from reading list", { id: "pulse-action" });
                  else toast.success("Saved to reading list", { id: "pulse-action" });
                }}
                onVote={(value) => {
                  const current =
                    state.votes.find((item) => item.storyId === story.id)?.value ?? null;
                  void commit(toggleVote(state, story.id, value));
                  if (current === value) toast("Vote removed", { id: "pulse-action" });
                  else if (value === "up") toast.success("Upvoted", { id: "pulse-action" });
                  else toast("Downvoted", { id: "pulse-action" });
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
