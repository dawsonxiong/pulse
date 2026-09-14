import { Button } from "@pulse/ui/components/button";
import { Separator } from "@pulse/ui/components/separator";
import { Wordmark } from "@pulse/ui/components/wordmark";
import { TAG_BY_SLUG } from "@pulse/shared";

type SidebarProps = {
  view: "feed" | "reading-list";
  tags: string[];
  activeTag: string | null;
  bookmarkCount: number;
  onView: (view: "feed" | "reading-list") => void;
  onFilterTag: (slug: string) => void;
  onEditTags: () => void;
};

const navItemClass =
  "w-full justify-start transition-none active:translate-y-0 active:not-aria-[haspopup]:translate-y-0";

export function Sidebar({
  view,
  tags,
  activeTag,
  bookmarkCount,
  onView,
  onFilterTag,
  onEditTags,
}: SidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border px-3 py-5 text-sidebar-foreground">
      <div className="px-1.5">
        <Wordmark />
      </div>
      <nav className="flex flex-col gap-1">
        <Button
          variant={view === "feed" && !activeTag ? "secondary" : "ghost"}
          className={navItemClass}
          onClick={() => onView("feed")}
        >
          My feed
        </Button>
        <Button
          variant={view === "reading-list" ? "secondary" : "ghost"}
          className={navItemClass}
          onClick={() => onView("reading-list")}
        >
          Reading list{bookmarkCount > 0 ? ` (${bookmarkCount})` : ""}
        </Button>
      </nav>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <h2 className="px-2 text-xs font-medium text-muted-foreground">Your tags</h2>
        <div className="flex flex-col gap-1">
          {tags.map((slug) => (
            <Button
              key={slug}
              variant={activeTag === slug ? "secondary" : "ghost"}
              className={navItemClass}
              onClick={() => onFilterTag(slug)}
            >
              {TAG_BY_SLUG.get(slug)?.label ?? slug}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className={`mt-1 ${navItemClass}`} onClick={onEditTags}>
          Edit tags
        </Button>
      </div>
    </aside>
  );
}
