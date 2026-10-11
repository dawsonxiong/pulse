import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDigest, fetchFeed } from "./api";

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
