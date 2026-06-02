/*
  Warnings:

  - The values [document_recommended,document_input_provided,login_failed] on the enum `DocumentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentStatus_new" AS ENUM ('draft', 'submitted', 'awaiting_agreement', 'approved', 'rejected', 'needs_changes', 'finalized', 'execution_complete');
ALTER TABLE "RapidDocument" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RapidDocument" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "DocumentStatus_old";
ALTER TABLE "RapidDocument" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "details" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RapidDocument" ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AuditLog_documentId_idx" ON "AuditLog"("documentId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RapidDocument_status_idx" ON "RapidDocument"("status");

-- CreateIndex
CREATE INDEX "RapidDocument_createdById_idx" ON "RapidDocument"("createdById");

-- CreateIndex
CREATE INDEX "RapidDocument_deadline_idx" ON "RapidDocument"("deadline");
