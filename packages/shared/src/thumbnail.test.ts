import { describe, expect, it } from "vitest";
import { usableStoryImage } from "./thumbnail";

describe("usableStoryImage", () => {
  it("keeps ordinary RSS images", () => {
    expect(usableStoryImage("https://github.blog/wp-content/uploads/2026/09/hero.png")).toContain(
      "github.blog",
    );
  });

  it("drops Google blog generated heroes", () => {
    expect(
      usableStoryImage(
        "https://storage.googleapis.com/gweb-developer-goog-blog-assets/images/BehavioralEvaliationMeta.2e16d0ba.fill-1200x600.jpg",
      ),
    ).toBeNull();
  });
});
