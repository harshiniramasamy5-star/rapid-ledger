-- AlterEnum: add notion_synced to AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'notion_synced';

-- CreateEnum: SyncStatus
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- AlterTable: add notion sync columns to RapidDocument
ALTER TABLE "RapidDocument" ADD COLUMN "notionPageId" TEXT;
ALTER TABLE "RapidDocument" ADD COLUMN "syncedAt" TIMESTAMP(3);
ALTER TABLE "RapidDocument" ADD COLUMN "syncStatus" "SyncStatus";
