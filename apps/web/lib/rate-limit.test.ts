import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { enforceAll } = await import("./rate-limit");

function fakeLimiter(success: boolean) {
  return {
    limit: vi.fn(async (_key: string) => ({ success, reset: Date.now() + 30_000 })),
  };
}

function request(ip = "203.0.113.7") {
  return new Request("https://pulse.test/api/chat", {
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });
}

describe("enforceAll", () => {
  it("passes when every limiter allows", async () => {
    const perIp = fakeLimiter(true);
    const global = fakeLimiter(true);
    const result = await enforceAll(request(), [
      { limiter: perIp, key: "ip" },
      { limiter: global, key: "global" },
    ]);
    expect(result).toBeNull();
    expect(perIp.limit).toHaveBeenCalledWith("203.0.113.7");
    expect(global.limit).toHaveBeenCalledWith("global");
  });

  it("stops at the first refusal with a 429 and Retry-After", async () => {
    const perIp = fakeLimiter(false);
    const global = fakeLimiter(true);
    const result = await enforceAll(request(), [
      { limiter: perIp, key: "ip" },
      { limiter: global, key: "global" },
    ]);
    expect(result?.status).toBe(429);
    expect(Number(result?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(global.limit).not.toHaveBeenCalled();
  });
});
