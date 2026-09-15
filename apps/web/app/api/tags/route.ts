import { TAG_CATALOG } from "@pulse/shared";
import { json, preflight } from "@/lib/cors";
import { catalogLimiter, enforce } from "@/lib/rate-limit";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = await enforce(req, catalogLimiter);
  if (limited) return limited;
  return json(req, { tags: TAG_CATALOG }, 200, {
    "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  });
}
