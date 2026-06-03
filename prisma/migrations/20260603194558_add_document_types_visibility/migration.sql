-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RAPID', 'PORTAL', 'TRANSCRIPT');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'ORG', 'PUBLIC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'document_type_changed';
ALTER TYPE "AuditAction" ADD VALUE 'visibility_changed';

-- AlterTable
ALTER TABLE "RapidDocument" ADD COLUMN     "documentType" "DocumentType" NOT NULL DEFAULT 'RAPID',
ADD COLUMN     "parentDocumentId" TEXT,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- AddForeignKey
ALTER TABLE "RapidDocument" ADD CONSTRAINT "RapidDocument_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "RapidDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
