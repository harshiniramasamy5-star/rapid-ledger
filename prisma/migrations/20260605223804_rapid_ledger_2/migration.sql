/*
  Warnings:

  - The values ["email_verification_sent","email_verified"] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('login', 'login_failed', 'document_created', 'document_submitted', 'document_approved', 'document_rejected', 'document_needs_changes', 'document_finalized', 'document_versioned', 'role_assigned', 'evidence_added', 'user_created', 'user_updated', 'ledger_entry_created', 'document_recommended', 'document_input_provided', 'execution_complete', 'org_created', 'document_type_changed', 'visibility_changed', 'invite_sent', 'invite_accepted', 'notion_synced', 'email_verification_sent', 'email_verified', 'totp_enabled', 'totp_disabled', 'transcript_exported', 'webhook_failed', 'webhook_retried', 'sync_failed', 'sync_recovered');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "AuditAction_old";
COMMIT;
