import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { TAG_CATALOG } from "@pulse/shared";
import { prisma } from "../src/index";
import { SEED_SOURCES } from "./sources";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../../../.env") });
loadEnv({ path: path.resolve(here, "../../../.env.local") });

async function main() {
  const catalogSlugs = new Set(TAG_CATALOG.map((tag) => tag.slug));

  for (const tag of TAG_CATALOG) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { label: tag.label, kind: tag.kind },
      create: { slug: tag.slug, label: tag.label, kind: tag.kind },
    });
  }

  for (const source of SEED_SOURCES) {
    const tags = source.tags.filter((slug) => catalogSlugs.has(slug));
    const row = await prisma.source.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        siteUrl: source.siteUrl,
        rssUrl: source.rssUrl,
        authorityScore: source.authorityScore,
        active: source.active ?? true,
      },
      create: {
        slug: source.slug,
        name: source.name,
        siteUrl: source.siteUrl,
        rssUrl: source.rssUrl,
        authorityScore: source.authorityScore,
        active: source.active ?? true,
      },
    });

    await prisma.sourceTag.deleteMany({ where: { sourceId: row.id } });
    if (tags.length > 0) {
      await prisma.sourceTag.createMany({
        data: tags.map((tagSlug) => ({ sourceId: row.id, tagSlug })),
      });
    }
  }

  console.log(`Seeded ${TAG_CATALOG.length} tags and ${SEED_SOURCES.length} sources.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
