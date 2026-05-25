-- Rename title to titleId, add titleEn
ALTER TABLE "DocumentGuide" RENAME COLUMN "title" TO "titleId";
ALTER TABLE "DocumentGuide" ADD COLUMN "titleEn" TEXT;

-- Copy titleId to titleEn for existing rows
UPDATE "DocumentGuide" SET "titleEn" = "titleId" WHERE "titleEn" IS NULL;

-- Multi-cover images table
CREATE TABLE "DocumentGuideImage" (
    "id" TEXT NOT NULL,
    "documentGuideId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentGuideImage_pkey" PRIMARY KEY ("id")
);

-- Migrate legacy coverImage to DocumentGuideImage
INSERT INTO "DocumentGuideImage" ("id", "documentGuideId", "filename", "sortOrder", "createdAt")
SELECT gen_random_uuid()::text, "id", "coverImage", 0, NOW()
FROM "DocumentGuide"
WHERE "coverImage" IS NOT NULL AND TRIM("coverImage") <> '';

ALTER TABLE "DocumentGuide" DROP COLUMN "coverImage";

ALTER TABLE "DocumentGuideImage" ADD CONSTRAINT "DocumentGuideImage_documentGuideId_fkey" FOREIGN KEY ("documentGuideId") REFERENCES "DocumentGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DocumentGuideImage_documentGuideId_idx" ON "DocumentGuideImage"("documentGuideId");

-- Order email delivery tracking
ALTER TABLE "Order" ADD COLUMN "emailDeliveredAt" TIMESTAMP(3);
