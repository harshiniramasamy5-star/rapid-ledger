# Source: https://github.com/harshiniramasamy5-star/rapid-ledger/blob/main/ARCHITECTURE.md

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[rapid-ledger](https://github.com/harshiniramasamy5-star/rapid-ledger)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger)
 

 

## FilesExpand file tree

 main

/

# ARCHITECTURE.md

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

## History

[History](https://github.com/harshiniramasamy5-star/rapid-ledger/commits/main/ARCHITECTURE.md)

History

225 lines (184 loc) · 7.75 KB

## FilesExpand file tree

 main

/

# ARCHITECTURE.md

Copy path

Top

## File metadata and controls

- Preview
 
- Code
 
- Blame
 

225 lines (184 loc) · 7.75 KB

[Raw](https://github.com/harshiniramasamy5-star/rapid-ledger/raw/refs/heads/main/ARCHITECTURE.md)

Copy raw file

Download raw file

Outline

Edit and raw actions

# RAPID Ledger — Architecture

**Version:** 2.0 
**Date:** 09 Jun 2026 
**Stack:** Elysia (Bun) · Next.js 15 · PostgreSQL · Prisma · Railway · Vercel

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   Next.js 15 (Vercel)  ·  portal-beta-bay.vercel.app        │
│   Auth: rapid_token cookie  ·  RBAC middleware               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / CORS
┌──────────────────────────▼──────────────────────────────────┐
│                         API LAYER                            │
│   Elysia (Bun)  ·  Railway  ·  Port 3001                    │
│   JWT auth middleware  ·  Rate limiting  ·  Permission RBAC  │
└──────┬────────┬────────┬────────┬────────┬──────────────────┘
       │        │        │        │        │
       ▼        ▼        ▼        ▼        ▼
    Auth    Documents  Webhooks  Orgs   Integrations
    Routes  Routes     Routes    Routes  Routes
       │        │        │        │        │
       └────────┴────────┴────────┴────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      DATA LAYER                              │
│   PostgreSQL (Railway)  ·  Prisma ORM                        │
│   Multi-tenant: all tables scoped by org_id                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Services

### Authentication Service (`auth.service.ts`)

- `registerUser` — bcrypt hash, domain validation, org auto-assign, verification token
- `loginUser` — email verified gate, lockout check, TOTP gate, JWT issuance
- `verifyEmail` — token lookup, mark verified, send welcome email
- `resendVerificationEmail` — rate-safe resend

### Document Service (`document.service.ts`)

- Full RAPID lifecycle: draft → submitted → awaiting\_agreement → approved → locked
- `approveDocument` — locks doc, writes AuditLog, fires WebhookDispatcher
- `rejectDocument` — symmetric rejection with reason
- Email notifications to all role participants on every state transition

### WebhookDispatcher (`webhookDispatcher.ts`)

```
Document Approved
       ↓
WebhookDispatcher.dispatch("document.approved")
       ↓ (parallel, Promise.allSettled)
  ┌────┴────┐
  ▼         ▼
Notion    Linear
Handler   Handler
```

- Handlers registered at startup in `index.ts`
- Failures logged to AuditLog, never block approval response
- Retry logic in LinearWebhookHandler (3 attempts, exponential backoff)

### Transcript Pipeline (`integrations.routes.ts` + `fathom.webhook.ts`)

```
Meeting Transcript (paste or webhook)
       ↓
[RAPID] prefix filter
       ↓
Groq llama-3.3-70b-versatile (dual parallel)
  ├── Role assignment (email → RAPID role map)
  └── Structured extraction (decisions, actions, owners, deadlines)
       ↓
Create TRANSCRIPT-type RapidDocument
       ↓
Create RoleAssignments for all participants
       ↓
Write AuditLog (source, callId, AI assignments)
```

---

## Data Models

### Core entities

```
Organization
  ├── Users (org_id FK)
  ├── RapidDocuments (org_id FK)
  ├── AuditLogs (org_id FK)
  └── Invites

RapidDocument
  ├── RoleAssignments (recommend/agree/perform/input/decide)
  ├── Approvals
  ├── LedgerEntries
  ├── Evidence
  ├── Comments
  └── AuditLogs
  
User
  ├── emailVerified: Boolean
  ├── verificationToken: String?
  ├── totpSecret: String?
  ├── totpEnabled: Boolean
  ├── failedLogins: Int
  └── lockedUntil: DateTime?
```

### Document Types

- `RAPID` — core compliance decision document
- `TRANSCRIPT` — meeting transcript, links to parent RAPID doc via `parentDocumentId`
- `PORTAL` — public/cross-org visible document

### Visibility

- `PRIVATE` — creator only
- `ORG` — all org members
- `PUBLIC` — cross-org (portal documents)

---

## Security Architecture

### Authentication flow

```
POST /auth/login
  → check emailVerified
  → check lockedUntil
  → bcrypt.compare password
  → if totpEnabled → return { requiresMfa, userId }
  → POST /auth/totp/validate (second factor)
  → signToken() → JWT issued
```

### RBAC

- Roles: `admin | creator | approver | recommender | performer | viewer`
- `requirePermission()` middleware on every protected route
- Frontend: `middleware.ts` checks `rapid_role` cookie against ROLE\_ACCESS map

### Multi-tenancy

- Every DB query scoped by `orgId` extracted from JWT
- No cross-tenant data leakage possible at ORM layer

---

## Integration Architecture

### Notion Sync

- Trigger: `approveDocument` handler
- Idempotent: checks `notionPageId` before create vs update
- 12 mapped properties: title, status, approver, date, roles, summary, audit ref
- Error handling: 429 (rate limit), 401 (bad key), timeout — all non-fatal

### Linear Integration

- Trigger: `WebhookDispatcher` on `document.approved`
- GraphQL `issueCreate` mutation
- Retry: 3 attempts, 1s/2s/3s backoff
- Audit log: issue ID + URL stored on success, error stored on failure

### Fathom Webhook

- `POST /api/webhooks/fathom`
- HMAC-SHA256 signature validation
- Idempotency: callId checked against AuditLog before processing
- Auto-creates org users from attendee emails

---

## Environment Variables

| Variable | Service | Required |
| --- | --- | --- |
| `DATABASE_URL` | Railway PostgreSQL | ✅ |
| `JWT_SECRET` | Token signing | ✅ |
| `SMTP_USER` | Office365 SMTP | ✅ |
| `SMTP_PASSWORD` | Office365 SMTP | ✅ |
| `FRONTEND_URL` | Email links | ✅ |
| `GROQ_API_KEY` | AI pipeline | ✅ |
| `NOTION_API_KEY` | Notion sync | ✅ |
| `NOTION_DATABASE_ID` | Notion sync | ✅ |
| `LINEAR_API_KEY` | Linear integration | ✅ |
| `LINEAR_TEAM_ID` | Linear integration | ✅ |
| `FATHOM_WEBHOOK_SECRET` | Webhook HMAC | ✅ |
| `NEXT_PUBLIC_API_URL` | Frontend → API | ✅ |

---

## Deployment

```
GitHub (main branch)
  ├── push → Railway auto-deploy (API)
  │     └── prisma migrate deploy + bun start
  └── push → Vercel auto-deploy (Frontend)
        └── next build
```

**Railway start command:** `./node_modules/.bin/prisma migrate deploy && bun run src/index.ts`

---

## Test Architecture

```
apps/api/
  ├── tests/api.test.ts          — 80 Vitest integration tests (Railway DB)
  ├── src/__tests__/rbac.test.ts — RBAC permission unit tests
  └── src/tests/immutability.test.ts — Document lock tests

apps/web/
  ├── app/login/login.test.tsx   — Login page unit tests (Jest/jsdom)
  └── tests/
      ├── login.test.tsx         — Login redirect tests
      └── approvals.test.tsx     — Approvals page tests

Runner:
  API  → npx vitest run (respects vitest.config.ts timeout: 60s)
  Web  → npx jest --passWithNoTests
```

**Total: 118 tests, 100% passing as of Jun 9 2026**