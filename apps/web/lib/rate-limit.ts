import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// The Vercel Marketplace integration sets KV_REST_API_*; a direct Upstash setup sets UPSTASH_REDIS_REST_*.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const feedLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:feed" })
  : null;

export const catalogLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:catalog" })
  : null;

export const articleLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), prefix: "rl:article" })
  : null;

export const commentLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m"), prefix: "rl:comment" })
  : null;

/** Every chat message is a paid model call, so chat has per-IP and global caps. */
export const CHAT_LIMITS = {
  perMinute: 6,
  perDay: 40,
  globalPerDay: 2000,
} as const;

type Limiter = { limit(key: string): Promise<{ success: boolean; reset: number }> };
export type KeyedLimiter = { limiter: Limiter; key: "ip" | "global" };

const chatLimiters: KeyedLimiter[] | null = redis
  ? [
      {
        limiter: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(CHAT_LIMITS.perMinute, "1 m"),
          prefix: "rl:chat:minute",
        }),
        key: "ip",
      },
      {
        limiter: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(CHAT_LIMITS.perDay, "1 d"),
          prefix: "rl:chat:day",
        }),
        key: "ip",
      },
      {
        limiter: new Ratelimit({
          redis,
          limiter: Ratelimit.fixedWindow(CHAT_LIMITS.globalPerDay, "1 d"),
          prefix: "rl:chat:global",
        }),
        key: "global",
      },
    ]
  : null;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

function tooManyRequests(reset: number): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": Math.max(1, Math.ceil((reset - Date.now()) / 1000)).toString() },
  });
}

export async function enforce(req: Request, limiter: Ratelimit | null): Promise<Response | null> {
  if (!limiter) return null;
  return enforceAll(req, [{ limiter, key: "ip" }]);
}

/** Checks limiters in order and stops at the first one that refuses. */
export async function enforceAll(req: Request, limiters: KeyedLimiter[]): Promise<Response | null> {
  const ip = clientIp(req);
  for (const { limiter, key } of limiters) {
    const { success, reset } = await limiter.limit(key === "ip" ? ip : "global");
    if (!success) return tooManyRequests(reset);
  }
  return null;
}

/**
 * Chat fails closed: without Redis in production there is no cap on paid
 * model calls, so the route refuses instead of running unmetered.
 */
export async function enforceChat(req: Request): Promise<Response | null> {
  if (!chatLimiters) {
    if (process.env.VERCEL_ENV === "production") {
      return new Response("Chat is unavailable", { status: 503 });
    }
    return null;
  }
  return enforceAll(req, chatLimiters);
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
