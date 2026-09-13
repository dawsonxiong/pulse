import { Badge } from "@pulse/ui/components/badge";
import { Separator } from "@pulse/ui/components/separator";
import { Wordmark } from "@pulse/ui/components/wordmark";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4">
        <Wordmark />
        <h1 className="font-heading text-4xl font-medium tracking-tight text-balance">
          Keep up to date with the latest dev news.
        </h1>
        <p className="max-w-xl text-muted-foreground text-pretty">
          Pulse replaces Chrome&apos;s new tab with a high-signal feed of dev posts.
        </p>
      </header>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Load the unpacked extension</h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            From the repo root, run{" "}
            <Badge variant="secondary" className="font-mono font-normal">
              pnpm --filter @pulse/extension build
            </Badge>
          </li>
          <li>
            Open{" "}
            <Badge variant="secondary" className="font-mono font-normal">
              chrome://extensions
            </Badge>{" "}
            and enable Developer mode
          </li>
          <li>
            Load unpacked →{" "}
            <Badge variant="secondary" className="font-mono font-normal">
              apps/extension/dist/chrome-mv3
            </Badge>
          </li>
          <li>Open a new tab, pick at least five tags, and the feed should paint immediately</li>
        </ol>
      </section>
    </main>
  );
}
