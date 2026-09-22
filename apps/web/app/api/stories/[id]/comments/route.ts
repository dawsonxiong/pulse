import { prisma } from "@pulse/db";
import type { StoryComment } from "@pulse/shared";
import { z } from "zod";
import { json, preflight } from "@/lib/cors";
import { commentLimiter, enforce } from "@/lib/rate-limit";

const idSchema = z.string().uuid();
const createSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  body: z.string().trim().min(1).max(2000),
  parentId: idSchema.nullish(),
});

function toStoryComment(row: {
  id: string;
  parentId: string | null;
  displayName: string;
  body: string;
  createdAt: Date;
}): StoryComment {
  return {
    id: row.id,
    parentId: row.parentId,
    displayName: row.displayName,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function isMissingRelation(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (code === "P2021" || code === "P2022" || code === "P2010") return true;
  }
  const text = err instanceof Error ? err.message : String(err);
  return /does not exist in the current database/i.test(text);
}

export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await enforce(req, commentLimiter);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return json(req, { error: "invalid id" }, 400);

  const story = await prisma.story.findUnique({ where: { id }, select: { id: true } });
  if (!story) return json(req, { error: "not found" }, 404);

  try {
    const rows = await prisma.comment.findMany({
      where: { storyId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return json(req, { comments: rows.map(toStoryComment) });
  } catch (err) {
    if (isMissingRelation(err)) return json(req, { comments: [] });
    throw err;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await enforce(req, commentLimiter);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return json(req, { error: "invalid id" }, 400);

  let parsed: z.infer<typeof createSchema>;
  try {
    parsed = createSchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid body" }, 400);
  }

  const story = await prisma.story.findUnique({ where: { id }, select: { id: true } });
  if (!story) return json(req, { error: "not found" }, 404);

  let row;
  try {
    // Threads are one level deep: a reply to a reply attaches to the top-level comment.
    let parentId: string | null = null;
    if (parsed.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parsed.parentId },
        select: { id: true, storyId: true, parentId: true },
      });
      if (!parent || parent.storyId !== id) return json(req, { error: "invalid parent" }, 400);
      parentId = parent.parentId ?? parent.id;
    }
    row = await prisma.comment.create({
      data: {
        storyId: id,
        parentId,
        displayName: parsed.displayName,
        body: parsed.body,
      },
    });
  } catch (err) {
    if (isMissingRelation(err)) return json(req, { error: "comments unavailable" }, 503);
    throw err;
  }
  return json(req, { comment: toStoryComment(row) }, 201);
}

export const dynamic = "force-dynamic";
