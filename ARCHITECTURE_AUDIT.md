# ARCHITECTURE AUDIT — RAPID Ledger v2
**Generated:** 2026-06-05
**Sprint:** Architecture Completion

---

## Executive Summary

| Layer | Status |
|-------|--------|
| Backend services | ✅ Complete |
| Backend routes | ✅ Complete |
| Prisma schema | ✅ Complete |
| Webhook / event bus | ✅ Complete |
| Notion integration | ✅ Complete |
| Transcript pipeline | ✅ Complete |
| Frontend pages | ✅ Complete |
| Org management | ✅ Complete |
| TOTP / 2FA | ✅ Complete |
| Audit log coverage | ✅ Complete (this sprint) |
| Infrastructure | ✅ Railway + Vercel live |

---

## Backend Services

| Service | Purpose |
|---------|---------|
| audit.service.ts | createAuditLog() — immutable log writer |
| auth.service.ts | JWT issue/verify, refresh token rotation |
| document.service.ts | RAPID document lifecycle, submit, approve, dispatch |
| email.service.ts | Email verification / invite emails |
| ledger.service.ts | Finalize + LedgerEntry creation |
| linear.service.ts | Optional engineering integration (no-op without env vars) |
| notion.service.ts | Sync approved docs to Notion DB via REST API |
| pdf.service.ts | PDF export generation |
| validation.service.ts | RAPID role validation engine |
| webhookDispatcher.ts | Central event bus — all integrations subscribe here |

## Backend Routes

| Route File | Prefix | Key Endpoints |
|-----------|--------|--------------|
| auth.routes.ts | /auth | register, login, logout, refresh, verify-email |
| document.routes.ts | /documents | CRUD, submit, recommend, input, perform, reject, version |
| approval.routes.ts | /approvals | approve, pending |
| audit.routes.ts | /audit | logs with filters |
| org.routes.ts | /orgs | create, invite, join, members |
| totp.routes.ts | /auth/totp | setup, verify, disable, validate |
| transcript.routes.ts | /documents | transcript attach/export/get |
| integrations.routes.ts | /integrations | notion/connect, sync, status, resync |
| webhook.routes.ts | /webhooks | linear/trigger (optional) |
| ledger.routes.ts | /ledger | entries, finalize |
| user.routes.ts | /users | CRUD, role management |
| ai.routes.ts | /ai | chat |
| comments.routes.ts | /documents | comments CRUD |

## Prisma Schema Enums

| Enum | Values |
|------|--------|
| DocumentType | RAPID, PORTAL, TRANSCRIPT |
| SyncStatus | PENDING, SYNCED, FAILED |
| DocumentStatus | draft, review, awaiting_agreement, approved, rejected, finalized, execution_complete, needs_changes |
| RoleType | RECOMMEND, AGREE, PERFORM, INPUT, DECIDE |
| AuditAction | login, login_failed, document_created, document_submitted, document_approved, document_rejected, document_finalized, document_versioned, role_assigned, evidence_added, user_created, user_updated, ledger_entry_created, document_recommended, document_input_provided, execution_complete, org_created, document_type_changed, visibility_changed, invite_sent, invite_accepted, notion_synced, email_verification_sent, email_verified, totp_enabled, totp_disabled, transcript_exported, webhook_failed, webhook_retried, sync_failed, sync_recovered |
| UserRole | admin, creator, approver, recommender, performer, viewer |

## Primary Workflow

Meeting → Fathom AI
→ Upload transcript → RAPID Ledger TRANSCRIPT document
→ Link to RAPID document
→ Submit → Role validation
→ Approve → status: approved
→ WebhookDispatcher.dispatch("document.approved")
→ NotionSyncService.sync()
→ Notion DB page created, notionPageId stored, syncStatus: SYNCED
→ AuditLog: notion_synced

## Frontend Pages

| Route | Purpose |
|-------|---------|
| /login | Auth with optional TOTP step |
| /dashboard | Overview, stats, recent docs |
| /documents | List + create |
| /documents/[id] | Detail, approve, Notion badge |
| /approvals | Pending approvals queue |
| /audit-log | Audit trail viewer |
| /ledger | Finalized ledger entries |
| /admin | User management |
| /verify-email | Email verification flow |

## Infrastructure

| Component | Provider | Status |
|-----------|----------|--------|
| API | Railway (Bun runtime) | ✅ Live |
| Database | Railway PostgreSQL | ✅ Live |
| Frontend | Vercel (Next.js 15) | ✅ Live |
| CI/CD | GitHub Actions | ✅ Green |

## Required Environment Variables

Railway: DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, NOTION_API_KEY, NOTION_DATABASE_ID
Vercel: NEXT_PUBLIC_API_URL
