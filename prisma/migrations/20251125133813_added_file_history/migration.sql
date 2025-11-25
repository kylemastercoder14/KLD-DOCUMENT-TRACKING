-- CreateEnum
CREATE TYPE "DocumentWorkflowStage" AS ENUM ('INSTRUCTOR', 'DEAN', 'VPAA', 'VPADA', 'PRESIDENT', 'REGISTRAR', 'ARCHIVES');

-- CreateEnum
CREATE TYPE "DocumentHistoryAction" AS ENUM ('SUBMITTED', 'FORWARDED', 'APPROVED', 'REJECTED', 'RETURNED', 'SIGNATURE_ATTACHED', 'COMMENTED');

-- CreateEnum
CREATE TYPE "DocumentRejectionReason" AS ENUM ('MISSING_INFORMATION', 'INVALID_DETAILS', 'POLICY_VIOLATION', 'NEEDS_REVISION', 'OTHER');

-- CreateTable
CREATE TABLE "DocumentHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" "DocumentHistoryAction" NOT NULL,
    "stage" "DocumentWorkflowStage" NOT NULL,
    "status" "DocumentStatus" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "rejectionReason" "DocumentRejectionReason",
    "rejectionDetails" TEXT,
    "performedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
