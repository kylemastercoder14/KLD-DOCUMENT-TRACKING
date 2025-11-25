/*
  Warnings:

  - You are about to drop the column `designationId` on the `_DesignationDocumentCategories` table. All the data in the column will be lost.
  - You are about to drop the column `documentCategoryId` on the `_DesignationDocumentCategories` table. All the data in the column will be lost.
  - Added the required column `A` to the `_DesignationDocumentCategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `B` to the `_DesignationDocumentCategories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_DesignationDocumentCategories" DROP CONSTRAINT "_DesignationDocumentCategories_designationId_fkey";

-- DropForeignKey
ALTER TABLE "_DesignationDocumentCategories" DROP CONSTRAINT "_DesignationDocumentCategories_documentCategoryId_fkey";

-- DropIndex
DROP INDEX "_DesignationDocumentCategories_designationId_documentCategoryId";

-- DropIndex
DROP INDEX "_DesignationDocumentCategories_documentCategoryId_idx";

-- AlterTable
ALTER TABLE "_DesignationDocumentCategories" DROP COLUMN "designationId",
DROP COLUMN "documentCategoryId",
ADD COLUMN     "A" TEXT NOT NULL,
ADD COLUMN     "B" TEXT NOT NULL,
ADD CONSTRAINT "_DesignationDocumentCategories_AB_pkey" PRIMARY KEY ("A", "B");

-- CreateIndex
CREATE INDEX "_DesignationDocumentCategories_B_index" ON "_DesignationDocumentCategories"("B");

-- AddForeignKey
ALTER TABLE "_DesignationDocumentCategories" ADD CONSTRAINT "_DesignationDocumentCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Designation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DesignationDocumentCategories" ADD CONSTRAINT "_DesignationDocumentCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "DocumentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
