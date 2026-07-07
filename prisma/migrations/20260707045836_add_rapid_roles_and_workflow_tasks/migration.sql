-- CreateEnum
CREATE TYPE "RoleAssignmentStatus" AS ENUM ('pending', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "WorkflowMode" AS ENUM ('sequential', 'parallel', 'hybrid');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'task_completed';
ALTER TYPE "AuditAction" ADD VALUE 'workflow_stage_advanced';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleType" ADD VALUE 'review';
ALTER TYPE "RoleType" ADD VALUE 'acknowledge';
ALTER TYPE "RoleType" ADD VALUE 'inform';

-- AlterTable
ALTER TABLE "RapidDocument" ADD COLUMN     "workflowMode" "WorkflowMode" NOT NULL DEFAULT 'parallel';

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN     "actionLabel" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "stageOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "RoleAssignmentStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "RoleAssignment_userId_status_idx" ON "RoleAssignment"("userId", "status");

-- CreateIndex
CREATE INDEX "RoleAssignment_documentId_idx" ON "RoleAssignment"("documentId");
