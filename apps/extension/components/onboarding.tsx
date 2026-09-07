import { TAG_CATALOG, type Tag } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { Toggle } from "@pulse/ui/components/toggle";
import { Wordmark } from "@pulse/ui/components/wordmark";
import { useEffect } from "react";

type OnboardingProps = {
  selected: string[];
  catalog?: readonly Tag[];
  editing?: boolean;
  onToggle: (slug: string) => void;
  onContinue: () => void;
};

const GROUPS = [
  { kind: "language", label: "Languages" },
  { kind: "tool", label: "Tools" },
  { kind: "topic", label: "Topics" },
] as const;

export function Onboarding({
  selected,
  catalog = TAG_CATALOG,
  editing = false,
  onToggle,
  onContinue,
}: OnboardingProps) {
  const ready = selected.length >= 5;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      if (!ready) return;
      onContinue();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, onContinue]);

  return (
    <div className="pulse-glow min-h-full bg-background">
      <div className="mx-auto grid min-h-full max-w-6xl lg:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.2fr)]">
        <aside className="flex flex-col justify-between gap-10 border-border px-8 py-10 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:px-12 lg:py-14">
          <div className="flex flex-col gap-4">
            <Wordmark />
            <h1 className="font-heading text-4xl font-medium tracking-tight text-balance lg:text-5xl">
              {editing ? "Edit tags" : "This tab is yours."}
            </h1>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
              {editing
                ? "Languages, tools, topics. Keep at least five."
                : "Languages, tools, topics. Pick at least five, then the feed opens."}
            </p>
          </div>
          <Button size="lg" disabled={!ready} onClick={onContinue} className="self-start">
            {ready ? (editing ? "Done" : "Continue") : `${selected.length} / 5`}
          </Button>
        </aside>

        <section className="flex flex-col gap-10 px-8 py-10 lg:px-12 lg:py-14">
          {GROUPS.map((group) => (
            <div key={group.kind} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
              <div className="flex flex-wrap gap-1.5">
                {catalog
                  .filter((tag) => tag.kind === group.kind)
                  .map((tag) => (
                    <Toggle
                      key={tag.slug}
                      variant="outline"
                      size="sm"
                      pressed={selected.includes(tag.slug)}
                      onPressedChange={() => onToggle(tag.slug)}
                      className="aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/80 aria-pressed:hover:text-primary-foreground data-[state=on]:border-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/80 data-[state=on]:hover:text-primary-foreground"
                    >
                      {tag.label}
                    </Toggle>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
