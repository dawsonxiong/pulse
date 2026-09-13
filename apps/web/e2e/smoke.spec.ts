import { expect, test } from "@playwright/test";

test("landing page explains Pulse and unpacked install", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /developer news, clustered/i })).toBeVisible();
  await expect(page.getByText("we never rewrite a headline")).toBeVisible();
  await expect(page.getByText("apps/extension/dist/chrome-mv3")).toBeVisible();
});

test("GET /api/tags returns the catalog", async ({ request }) => {
  const response = await request.get("/api/tags");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { tags: { slug: string }[] };
  expect(body.tags.length).toBeGreaterThan(10);
  expect(body.tags.some((tag) => tag.slug === "rust")).toBeTruthy();
});

test("GET /api/feed returns stories with original titles", async ({ request }) => {
  const response = await request.get("/api/feed?tags=rust,postgres");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    stories: { representative: { title: string }; posts: { title: string }[] }[];
  };
  expect(body.stories.length).toBeGreaterThan(0);
  const rust = body.stories.find((story) =>
    story.representative.title.includes("Announcing Rust 1.81.0"),
  );
  expect(rust).toBeDefined();
  expect(rust?.posts.every((post) => post.title.length > 0)).toBeTruthy();
});

test("GET /api/cron/ingest without bearer is 401", async ({ request }) => {
  const response = await request.get("/api/cron/ingest");
  expect(response.status()).toBe(401);
});

test("GET /api/cron/icons without bearer is 401", async ({ request }) => {
  const response = await request.get("/api/cron/icons");
  expect(response.status()).toBe(401);
});
