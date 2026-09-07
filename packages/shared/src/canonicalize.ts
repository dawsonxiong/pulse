const TRACKING_PARAMS = new Set([
  "ref",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "feature",
  "si",
]);

function stripMobileHost(host: string): string {
  let next = host.toLowerCase();
  if (next.startsWith("www.")) next = next.slice(4);
  if (next.startsWith("m.")) next = next.slice(2);
  if (next.startsWith("mobile.")) next = next.slice(7);
  return next;
}

export function resolveHttpUrl(raw: string, base?: string): string | null {
  try {
    const parsed = base ? new URL(raw.trim(), base) : new URL(raw.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function canonicalizeUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  parsed.protocol = parsed.protocol === "http:" ? "https:" : parsed.protocol;
  parsed.hostname = stripMobileHost(parsed.hostname);
  parsed.hash = "";
  if (parsed.port === "80" || parsed.port === "443") parsed.port = "";

  const kept = [...parsed.searchParams.entries()].filter(([key]) => {
    const lower = key.toLowerCase();
    return !lower.startsWith("utm_") && !TRACKING_PARAMS.has(lower);
  });
  kept.sort(([a], [b]) => a.localeCompare(b));
  parsed.search = "";
  for (const [key, value] of kept) parsed.searchParams.append(key, value);

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}
