export function usableStoryImage(url: string | null): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === "storage.googleapis.com" && path.includes("gweb-developer-goog-blog")) {
    return null;
  }
  if (path.includes("fill-1200x600")) return null;
  return url;
}
