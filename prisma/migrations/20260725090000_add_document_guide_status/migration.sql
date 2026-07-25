-- CreateEnum
CREATE TYPE "DocumentGuideStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "DocumentGuide" ADD COLUMN "status" "DocumentGuideStatus" NOT NULL DEFAULT 'draft';
