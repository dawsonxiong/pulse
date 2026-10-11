import { json } from "@/lib/cors";
import { generateDigest } from "@/lib/digest";
import { requireCronSecret } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  if (!process.env.DATABASE_URL) {
    return json(req, { error: "DATABASE_URL is not set" }, 500);
  }

  try {
    const result = await generateDigest();
    return json(req, result);
  } catch (err) {
    console.error(err);
    const reason = err instanceof Error ? err.message : String(err);
    return json(req, { status: "failed", reason }, 500);
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
