import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export const feedLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:feed" })
  : null;

export const catalogLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:catalog" })
  : null;

export async function enforce(req: Request, limiter: Ratelimit | null): Promise<Response | null> {
  if (!limiter) return null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const { success, reset } = await limiter.limit(ip);
  if (success) return null;
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": Math.max(1, Math.ceil((reset - Date.now()) / 1000)).toString() },
  });
}

export function requireCronSecret(req: Request): Response | null {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const expected = process.env.CRON_SECRET;
  if (!expected) return new Response("CRON_SECRET not configured", { status: 500 });
  if (header !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
