import { TAG_CATALOG, type Tag } from "@pulse/shared";
import { Button } from "@pulse/ui/components/button";
import { FieldLegend, FieldSet } from "@pulse/ui/components/field";
import { ToggleGroup, ToggleGroupItem } from "@pulse/ui/components/toggle-group";
import { Wordmark } from "@pulse/ui/components/wordmark";
import { useEffect } from "react";

type OnboardingProps = {
  selected: string[];
  catalog?: readonly Tag[];
  editing?: boolean;
  onChange: (tags: string[]) => void;
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
  onChange,
  onContinue,
}: OnboardingProps) {
  const ready = selected.length >= 5;
  const remaining = Math.max(0, 5 - selected.length);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.defaultPrevented) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
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
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-4xl font-medium tracking-tight text-balance lg:text-5xl">
                {editing ? "Edit tags" : "This tab is yours."}
              </h1>
              <p className="text-sm text-muted-foreground">
                Pick the languages, tools, and topics you want to see in your feed.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="sr-only" aria-live="polite">
              {ready ? "Ready to continue" : `Select ${remaining} more tags`}
            </p>
            <Button size="lg" disabled={!ready} onClick={onContinue}>
              {ready ? (editing ? "Done" : "Continue") : `${selected.length} / 5`}
            </Button>
          </div>
        </aside>

        <section className="flex flex-col gap-10 px-8 py-10 lg:px-12 lg:py-14">
          {GROUPS.map((group) => {
            const tags = catalog.filter((tag) => tag.kind === group.kind);
            const slugs = new Set(tags.map((tag) => tag.slug));
            const value = selected.filter((slug) => slugs.has(slug));
            return (
              <FieldSet key={group.kind} className="gap-3">
                <FieldLegend variant="label" className="text-sm text-muted-foreground">
                  {group.label}
                </FieldLegend>
                <ToggleGroup
                  multiple
                  variant="outline"
                  size="sm"
                  spacing={1}
                  value={value}
                  className="flex flex-wrap"
                  aria-label={group.label}
                  onValueChange={(next) => {
                    const rest = selected.filter((slug) => !slugs.has(slug));
                    onChange([...rest, ...next]);
                  }}
                >
                  {tags.map((tag) => (
                    <ToggleGroupItem key={tag.slug} value={tag.slug}>
                      {tag.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>
            );
          })}
        </section>
      </div>
    </div>
  );
}
