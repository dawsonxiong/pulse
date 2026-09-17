import { prisma } from "../src/index";

async function main() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sources = await prisma.source.findMany({
    where: { active: true },
    orderBy: { slug: "asc" },
  });
  const totals = await prisma.$queryRaw<Array<{ sourceId: string; n: number }>>`
    SELECT "sourceId", COUNT(*)::int AS n FROM posts GROUP BY "sourceId"
  `;
  const recents = await prisma.$queryRaw<Array<{ sourceId: string; n: number }>>`
    SELECT "sourceId", COUNT(*)::int AS n FROM posts
    WHERE "publishedAt" >= ${fourteenDaysAgo}
    GROUP BY "sourceId"
  `;
  const totalBySource = new Map(totals.map((row) => [row.sourceId, row.n]));
  const recentBySource = new Map(recents.map((row) => [row.sourceId, row.n]));
  const rows = sources.map((source) => ({
    slug: source.slug,
    posts: totalBySource.get(source.id) ?? 0,
    recent: recentBySource.get(source.id) ?? 0,
    lastFetchedAt: source.lastFetchedAt?.toISOString() ?? null,
    lastError: source.lastError,
  }));
  const errored = rows.filter((row) => row.lastError);
  const stale = rows.filter((row) => {
    if (!row.lastFetchedAt) return true;
    return Date.now() - new Date(row.lastFetchedAt).getTime() > 36 * 60 * 60 * 1000;
  });
  console.log(
    JSON.stringify(
      {
        sources: rows.length,
        errored: errored.length,
        stale: stale.length,
        erroredRows: errored,
        staleRows: stale,
        rows,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
