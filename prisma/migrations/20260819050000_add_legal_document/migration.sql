-- CreateEnum
CREATE TYPE "LegalSlug" AS ENUM ('terms', 'privacy');

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "slug" "LegalSlug" NOT NULL,
    "titleId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleHighlightId" TEXT NOT NULL,
    "titleHighlightEn" TEXT NOT NULL,
    "introId" TEXT NOT NULL,
    "introEn" TEXT NOT NULL,
    "bodyId" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_slug_key" ON "LegalDocument"("slug");
