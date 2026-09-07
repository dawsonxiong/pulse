import { describe, expect, it } from "vitest";
import { tagsFromTitle } from "./tags";

describe("tagsFromTitle", () => {
  it("picks catalog slugs that appear as whole words", () => {
    expect(tagsFromTitle("PostgreSQL 18 Released")).toContain("postgres");
    expect(tagsFromTitle("Announcing Rust 1.81.0")).toContain("rust");
  });

  it("does not treat 'going' as Go", () => {
    expect(tagsFromTitle("Going deep on CSS containers")).not.toContain("go");
  });
});
