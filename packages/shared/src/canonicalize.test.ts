import { describe, expect, it } from "vitest";
import { canonicalizeUrl, resolveHttpUrl } from "./canonicalize";

describe("canonicalizeUrl", () => {
  it("strips tracking params, www, trailing slash, and forces https", () => {
    const raw =
      "http://www.example.com/posts/rust-181/?utm_source=twitter&utm_medium=social&fbclid=abc#section";
    expect(canonicalizeUrl(raw)).toBe("https://example.com/posts/rust-181");
  });

  it("maps m. and mobile. hosts onto the apex", () => {
    expect(canonicalizeUrl("https://m.blog.cloudflare.com/workers")).toBe(
      "https://blog.cloudflare.com/workers",
    );
    expect(canonicalizeUrl("https://mobile.stripe.com/blog/foo/")).toBe(
      "https://stripe.com/blog/foo",
    );
  });

  it("returns null for non-http URLs", () => {
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeUrl("not a url")).toBeNull();
  });
});

describe("resolveHttpUrl", () => {
  it("resolves relative paths against a feed base", () => {
    expect(resolveHttpUrl("/blog/react-compiler", "https://react.dev/feed.xml")).toBe(
      "https://react.dev/blog/react-compiler",
    );
  });
});
