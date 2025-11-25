-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_SUBMITTED', 'DOCUMENT_ASSIGNED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_REQUIRES_ACTION', 'DOCUMENT_UPDATED', 'DOCUMENT_ARCHIVED', 'SYSTEM_ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "metadata" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
