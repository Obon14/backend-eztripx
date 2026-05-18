/*
  Warnings:

  - You are about to drop the column `name` on the `DocumentGuide` table. All the data in the column will be lost.
  - Added the required column `nameDocument` to the `DocumentGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `DocumentGuide` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentGuide" DROP COLUMN "name",
ADD COLUMN     "nameDocument" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "countryId" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
