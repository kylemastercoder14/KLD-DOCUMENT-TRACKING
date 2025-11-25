/*
  Warnings:

  - Made the column `designationId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "designationId" SET NOT NULL;
