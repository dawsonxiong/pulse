import { rankStories, TAG_BY_SLUG, type FeedStory, type RankableStory } from "@pulse/shared";
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
      .catch(() => {});
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
          setEditingTags(false);
          void commit({ ...state, onboarded: true });
        }}
      />
    );
  }

  const visibleStories = (() => {
    const base =
      view === "reading-list"
        ? state.bookmarks.map((item) => item.story)
        : ranked.map((item) => item.story);
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
        <h1 className="font-heading text-lg font-medium tracking-tight">
          {feedHeading(view, activeTag)}
        </h1>
        {visibleStories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {view === "reading-list" ? "Nothing saved yet." : "No stories match these tags yet."}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
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
                }}
                onVote={(value) => {
                  void commit(toggleVote(state, story.id, value));
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
