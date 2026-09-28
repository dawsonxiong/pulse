import { useState } from "react";
import { cn } from "@pulse/ui/lib/utils";

/** Dark silhouettes on a clear background. Drawn light so they read on the dark UI. */
const SILHOUETTE_HOSTS = new Set(["github.blog", "www.hashicorp.com"]);

/** Hosts whose site favicon is missing, corrupt, or a platform default. */
const ICON_FALLBACKS: Record<string, string> = {
  "netflixtechblog.com":
    "https://miro.medium.com/v2/resize:fill:160:160/1*ty4NvNrGg4ReETxqU2N3Og.png",
  "hacks.mozilla.org": "https://hacks.mozilla.org/wp-content/themes/Hax/img/mdn-logo-mono.svg",
};

export function iconFallbackFor(siteUrl: string): string | null {
  try {
    return ICON_FALLBACKS[new URL(siteUrl).hostname] ?? null;
  } catch {
    return null;
  }
}

export function iconCandidates(src: string | null, siteUrl?: string): string[] {
  const fallback = siteUrl ? iconFallbackFor(siteUrl) : null;
  const urls = [fallback, src];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

export function iconToneClass(siteUrl?: string): string {
  try {
    return SILHOUETTE_HOSTS.has(new URL(siteUrl ?? "").hostname) ? "brightness-0 invert" : "";
  } catch {
    return "";
  }
}

export function useIconCandidate(src: string | null, siteUrl?: string) {
  const candidates = iconCandidates(src, siteUrl);
  const signature = candidates.join("\n");
  const [state, setState] = useState({ signature, index: 0 });
  if (state.signature !== signature) setState({ signature, index: 0 });
  const index = state.signature === signature ? state.index : 0;
  return {
    src: candidates[index],
    onError: () => setState((value) => ({ signature, index: value.index + 1 })),
  };
}

type SourceIconProps = {
  src: string | null;
  siteUrl?: string;
  label: string;
  className?: string;
};

export function SourceIcon({ src, siteUrl, label, className }: SourceIconProps) {
  const icon = useIconCandidate(src, siteUrl);
  if (!icon.src) return null;

  return (
    <img
      src={icon.src}
      alt=""
      title={label}
      loading="lazy"
      decoding="async"
      className={cn("size-4 shrink-0 rounded-sm object-contain", iconToneClass(siteUrl), className)}
      onError={icon.onError}
    />
  );
}
