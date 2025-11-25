/*
  Warnings:

  - You are about to drop the column `designationId` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'PRESIDENT', 'VPAA', 'VPADA', 'DEAN', 'INSTRUCTOR');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_designationId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "designationId",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'INSTRUCTOR';
