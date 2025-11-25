-- Drop existing foreign key that enforces the one-to-many relation
ALTER TABLE "DocumentCategory" DROP CONSTRAINT "DocumentCategory_designationId_fkey";

-- Create the pivot table that will store many-to-many relations
CREATE TABLE "_DesignationDocumentCategories" (
    "designationId" TEXT NOT NULL,
    "documentCategoryId" TEXT NOT NULL
);

-- Ensure uniqueness and add helpful indexes
CREATE UNIQUE INDEX "_DesignationDocumentCategories_designationId_documentCategoryId_key" ON "_DesignationDocumentCategories"("designationId", "documentCategoryId");
CREATE INDEX "_DesignationDocumentCategories_documentCategoryId_idx" ON "_DesignationDocumentCategories"("documentCategoryId");

-- Add referential integrity
ALTER TABLE "_DesignationDocumentCategories" ADD CONSTRAINT "_DesignationDocumentCategories_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DesignationDocumentCategories" ADD CONSTRAINT "_DesignationDocumentCategories_documentCategoryId_fkey" FOREIGN KEY ("documentCategoryId") REFERENCES "DocumentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate current relationships into the new pivot table before dropping the column
INSERT INTO "_DesignationDocumentCategories" ("designationId", "documentCategoryId")
SELECT "designationId", "id"
FROM "DocumentCategory";

-- Remove the obsolete column
ALTER TABLE "DocumentCategory" DROP COLUMN "designationId";

