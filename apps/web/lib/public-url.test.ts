import { describe, expect, it } from "vitest";
import { isBlockedHostname, isPublicHttpUrl } from "./public-url";

describe("isPublicHttpUrl", () => {
  it("allows ordinary https article URLs", () => {
    expect(isPublicHttpUrl("https://thenewstack.io/some-post")).toBe(true);
  });

  it("blocks private and loopback hosts", () => {
    expect(isPublicHttpUrl("http://127.0.0.1/secret")).toBe(false);
    expect(isPublicHttpUrl("http://192.168.0.12/x")).toBe(false);
    expect(isPublicHttpUrl("http://localhost:3000/x")).toBe(false);
  });
});

describe("isBlockedHostname", () => {
  it("blocks link-local metadata hosts", () => {
    expect(isBlockedHostname("169.254.169.254")).toBe(true);
  });
});
