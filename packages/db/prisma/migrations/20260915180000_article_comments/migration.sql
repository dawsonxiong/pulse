-- AlterTable
ALTER TABLE "posts" ADD COLUMN "extractedHtml" TEXT;
ALTER TABLE "posts" ADD COLUMN "extractedText" TEXT;
ALTER TABLE "posts" ADD COLUMN "extractedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_storyId_createdAt_idx" ON "comments"("storyId", "createdAt");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
