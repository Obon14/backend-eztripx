-- CreateEnum
CREATE TYPE "DocumentGuidePreviewMode" AS ENUM ('hide', 'show');

-- AlterTable
ALTER TABLE "DocumentGuide"
ADD COLUMN "previewMode" "DocumentGuidePreviewMode" NOT NULL DEFAULT 'hide',
ADD COLUMN "previewPageCount" INTEGER NOT NULL DEFAULT 3;
