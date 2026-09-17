import { describe, expect, it } from "vitest";
import { EMPTY_STATE, localStateSchema } from "./storage";

describe("localStateSchema", () => {
  it("fills defaults for empty chrome.storage", () => {
    const parsed = localStateSchema.parse({});
    expect(parsed.onboarded).toBe(false);
    expect(parsed.tags).toEqual([]);
    expect(parsed.bookmarks).toEqual([]);
    expect(parsed.feedCache).toBeNull();
    expect(parsed.sort).toBe("for-you");
    expect(parsed.displayName).toBe("Anonymous");
    expect(EMPTY_STATE.hiddenStoryIds).toEqual([]);
  });
});
