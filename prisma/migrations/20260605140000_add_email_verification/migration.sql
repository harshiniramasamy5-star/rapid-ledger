-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE '"email_verification_sent"';
ALTER TYPE "AuditAction" ADD VALUE '"email_verified"';
