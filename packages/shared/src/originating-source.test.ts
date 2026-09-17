import { describe, expect, it } from "vitest";
import { displaySource } from "./originating-source";

const planet = {
  id: "src-planet",
  name: "Planet PostgreSQL",
  siteUrl: "https://planet.postgresql.org",
  iconUrl: "https://planet.postgresql.org/favicon.ico",
};

describe("displaySource", () => {
  it("keeps the feed source when the post lives on the same host", () => {
    expect(displaySource("https://planet.postgresql.org/post/1", planet)).toEqual(planet);
  });

  it("labels aggregator items with the originating host", () => {
    expect(displaySource("https://thebuild.com/blog/gucs", planet)).toEqual({
      id: "origin:thebuild.com",
      name: "thebuild.com",
      siteUrl: "https://thebuild.com",
      iconUrl: null,
    });
    expect(displaySource("https://www.ardentperf.com/2026/09/14/postgres-19", planet)).toEqual({
      id: "origin:ardentperf.com",
      name: "ardentperf.com",
      siteUrl: "https://ardentperf.com",
      iconUrl: null,
    });
  });

  it("is idempotent after the origin label is applied", () => {
    const labeled = displaySource("https://thebuild.com/blog/gucs", planet);
    expect(displaySource("https://thebuild.com/blog/gucs", labeled)).toEqual(labeled);
  });

  it("does not treat URL shorteners as the originating host", () => {
    expect(displaySource("https://postgr.es/p/9uI", planet)).toEqual(planet);
  });
});
