import { json } from "@/lib/cors";
import { requireCronSecret } from "@/lib/rate-limit";
import { refreshSourceIcons } from "@/lib/refresh-source-icons";

export async function GET(req: Request) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  if (!process.env.DATABASE_URL) {
    return json(req, { error: "DATABASE_URL is not set" }, 500);
  }

  const result = await refreshSourceIcons();
  return json(req, result);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
