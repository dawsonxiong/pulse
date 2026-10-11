import type { DigestResponse } from "@pulse/shared";
import { json, preflight } from "@/lib/cors";
import { latestDigest } from "@/lib/digest";
import { enforce, feedLimiter } from "@/lib/rate-limit";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = await enforce(req, feedLimiter);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    const body: DigestResponse = { digest: null };
    return json(req, body);
  }

  try {
    const body: DigestResponse = { digest: await latestDigest() };
    return json(req, body, 200, {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    });
  } catch (err) {
    console.error(err);
    const body: DigestResponse = { digest: null };
    return json(req, body);
  }
}

export const dynamic = "force-dynamic";
