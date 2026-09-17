import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeed } from "./api";

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

    const page = await fetchFeed(["postgres"]);
    expect(page.stories.map((story) => story.id)).toEqual(["a"]);
    expect(page.nextCursor).toBe("page-2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes the cursor on later pages", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("cursor=page-2");
      return Response.json({ stories: [], nextCursor: null });
    });
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchFeed(["postgres"], "page-2");
    expect(page.nextCursor).toBeNull();
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
