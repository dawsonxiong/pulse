-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('language', 'tool', 'topic');

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "rssUrl" TEXT NOT NULL,
    "authorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "excerpt" TEXT,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" UUID NOT NULL,
    "representativePostId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sourceCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_posts" (
    "storyId" UUID NOT NULL,
    "postId" UUID NOT NULL,

    CONSTRAINT "story_posts_pkey" PRIMARY KEY ("storyId","postId")
);

-- CreateTable
CREATE TABLE "tags" (
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "TagKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "source_tags" (
    "sourceId" UUID NOT NULL,
    "tagSlug" TEXT NOT NULL,

    CONSTRAINT "source_tags_pkey" PRIMARY KEY ("sourceId","tagSlug")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "postId" UUID NOT NULL,
    "tagSlug" TEXT NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("postId","tagSlug")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_slug_key" ON "sources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "posts_canonicalUrl_key" ON "posts"("canonicalUrl");

-- CreateIndex
CREATE INDEX "posts_publishedAt_idx" ON "posts"("publishedAt");

-- CreateIndex
CREATE INDEX "posts_sourceId_idx" ON "posts"("sourceId");

-- CreateIndex
CREATE INDEX "stories_publishedAt_idx" ON "stories"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "story_posts_postId_key" ON "story_posts"("postId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_representativePostId_fkey" FOREIGN KEY ("representativePostId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_posts" ADD CONSTRAINT "story_posts_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_posts" ADD CONSTRAINT "story_posts_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_tagSlug_fkey" FOREIGN KEY ("tagSlug") REFERENCES "tags"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagSlug_fkey" FOREIGN KEY ("tagSlug") REFERENCES "tags"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
