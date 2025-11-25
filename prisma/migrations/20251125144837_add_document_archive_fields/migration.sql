-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" TEXT,
ADD COLUMN     "archivedReason" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
