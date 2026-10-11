-- CreateTable
CREATE TABLE "digests" (
    "id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "stories" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "digests_createdAt_idx" ON "digests"("createdAt");
