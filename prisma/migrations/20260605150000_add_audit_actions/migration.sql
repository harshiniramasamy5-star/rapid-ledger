-- Migration: add missing AuditAction enum values
-- 2026-06-05 — Phase 11 audit log coverage

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'totp_enabled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'totp_disabled';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'transcript_exported';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'webhook_failed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'webhook_retried';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'sync_failed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'sync_recovered';
