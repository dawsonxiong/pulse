import { prisma } from "@pulse/db";
import { json, preflight } from "@/lib/cors";
import { catalogLimiter, enforce } from "@/lib/rate-limit";

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request) {
  const limited = await enforce(req, catalogLimiter);
  if (limited) return limited;

  if (!process.env.DATABASE_URL) {
    return json(req, { sources: [] });
  }

  try {
    const sources = await prisma.source.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        siteUrl: true,
        authorityScore: true,
        sourceTags: { select: { tagSlug: true } },
      },
    });
    return json(req, {
      sources: sources.map((source) => ({
        id: source.id,
        slug: source.slug,
        name: source.name,
        siteUrl: source.siteUrl,
        authorityScore: source.authorityScore,
        tags: source.sourceTags.map((row) => row.tagSlug),
      })),
    });
  } catch (err) {
    console.error(err);
    return json(req, { sources: [] });
  }
}

export const dynamic = "force-dynamic";
