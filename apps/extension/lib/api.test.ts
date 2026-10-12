import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatError, fetchDigest, fetchFeed, streamDigestChat, streamStoryChat } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchFeed", () => {
  it("returns one page and the next cursor", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        stories: [
          {
            id: "a",
            publishedAt: "2026-09-16T00:00:00.000Z",
            sourceCount: 1,
            sourceAuthority: 1,
            tags: [],
            score: 1,
            representative: post("a"),
            posts: [post("a")],
          },
        ],
        nextCursor: "page-2",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchFeed(["postgres"], "latest");
    expect(page.stories.map((story) => story.id)).toEqual(["a"]);
    expect(page.nextCursor).toBe("page-2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes the cursor on later pages", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("cursor=page-2");
      expect(String(input)).toContain("sort=for-you");
      return Response.json({ stories: [], nextCursor: null });
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchFeed(["postgres"], "for-you", "page-2");
    expect(page.nextCursor).toBeNull();
  });
});

describe("fetchDigest", () => {
  it("returns null when no brief exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ digest: null })),
    );
    expect(await fetchDigest()).toBeNull();
  });

  it("decodes the cited story snapshots", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toContain("/api/digest");
        return Response.json({
          digest: {
            id: "d1",
            generatedAt: "2026-10-10T07:30:00.000Z",
            items: [{ text: "Something happened.", storyIds: ["a"] }],
            stories: [
              {
                id: "a",
                publishedAt: "2026-10-10T00:00:00.000Z",
                sourceCount: 1,
                sourceAuthority: 1,
                tags: [],
                score: 1,
                representative: { ...post("a"), title: "Rust &amp; Go" },
                posts: [{ ...post("a"), title: "Rust &amp; Go" }],
              },
            ],
          },
        });
      }),
    );
    const digest = await fetchDigest();
    expect(digest?.items).toHaveLength(1);
    expect(digest?.stories[0]?.representative.title).toBe("Rust & Go");
  });
});

describe("streamStoryChat", () => {
  it("posts the history and hands back each streamed chunk", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        postId: "p1",
        messages: [{ role: "user", content: "TL;DR?" }],
      });
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("Short "));
          controller.enqueue(encoder.encode("answer."));
          controller.close();
        },
      });
      return new Response(body, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const chunks: string[] = [];
    await streamStoryChat("s1", "p1", [{ role: "user", content: "TL;DR?" }], (text) =>
      chunks.push(text),
    );
    expect(chunks.join("")).toBe("Short answer.");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/stories/s1/chat");
  });

  it("throws a ChatError carrying the status when rate limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Too Many Requests", { status: 429 })),
    );
    const error = await streamStoryChat(
      "s1",
      "p1",
      [{ role: "user", content: "hi" }],
      () => {},
    ).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ChatError);
    expect((error as ChatError).status).toBe(429);
  });
});

describe("streamDigestChat", () => {
  it("posts the brief id with the history", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/api/digest/chat");
      expect(JSON.parse(String(init?.body))).toEqual({
        digestId: "d1",
        messages: [{ role: "user", content: "What matters most?" }],
      });
      return new Response("See (1).", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    let answer = "";
    await streamDigestChat("d1", [{ role: "user", content: "What matters most?" }], (text) => {
      answer += text;
    });
    expect(answer).toBe("See (1).");
  });
});

function post(id: string) {
  return {
    id,
    url: `https://example.com/${id}`,
    title: id,
    author: null,
    excerpt: null,
    imageUrl: null,
    publishedAt: "2026-09-16T00:00:00.000Z",
    source: { id: "src", name: "Example", siteUrl: "https://example.com", iconUrl: null },
  };
}
