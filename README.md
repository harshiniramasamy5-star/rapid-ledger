![CI](https://github.com/harshiniramasamy5-star/rapid-ledger/actions/workflows/ci.yml/badge.svg)

# RAPID Ledger

> Decision governance without compromise.

RAPID Ledger is a full-stack governance application that enforces the **RAPID decision framework** across an organisation. It ensures every significant decision has exactly one accountable owner, proper approvals, evidence trails, and an immutable ledger — making governance auditable, structured, and enforceable.

---

## Table of Contents

1. [What is RAPID?](#1-what-is-rapid)
2. [Live Demo](#2-live-demo)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Local Setup](#5-local-setup)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Running the App](#8-running-the-app)
9. [Running Tests](#9-running-tests)
10. [Demo Credentials](#10-demo-credentials)
11. [Core Workflows](#11-core-workflows)
12. [API Overview](#12-api-overview)
13. [Known Limitations](#13-known-limitations)
14. [Future Improvements](#14-future-improvements)

---

## 1. What is RAPID?

RAPID is a decision-making framework that assigns clear roles to prevent ambiguity in high-stakes decisions:

| Letter | Role | Responsibility |
|--------|------|----------------|
| **R** | Recommend | Proposes the decision with supporting analysis |
| **A** | Agree | Must approve before the decision can proceed (required for high-risk decisions) |
| **P** | Perform | Executes the decision once finalised and marks it complete |
| **I** | Input | Provides information or expertise |
| **D** | Decide | The single accountable owner — exactly one per document |

### Business Rules Enforced Server-Side

- **Exactly one Decide owner** is required before a document can be submitted — enforced in the service layer, not just the UI
- **High-risk and critical decisions** require at least one Agree approver — enforced at submission time
- **Compliance-impacting decisions** require attached evidence before submission — enforced at submission time
- **Finalised documents are immutable** — PATCH is rejected once status is `finalised`
- **Ledger entries are permanent** — no deletion or mutation endpoints exist
- **Versioning preserves identity** — a new version keeps the same `documentCode` and increments the version number only
- **Audit logs are append-only** — every significant action is recorded with actor, timestamp, and metadata
- **Execution completion is tracked** — Performers can mark a finalised document as `execution_complete`, emitting an audit event

---

## 2. Live Demo

> **Before demoing:** Hit the health endpoint first to wake the Railway server (free tier sleeps after inactivity):
> ```
> curl https://rapid-ledger-production.up.railway.app/health
> ```
> Wait for `{"status":"ok"}` before opening the frontend.

| Service | URL |
|---------|-----|
| Frontend | https://rapid-ledger.vercel.app |
| Backend API | https://rapid-ledger-production.up.railway.app |
| Health check | https://rapid-ledger-production.up.railway.app/health |

Log in with any credential from [Section 10](#10-demo-credentials).

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TypeScript (strict), shadcn/ui, Tailwind CSS |
| Backend | Elysia (TypeScript HTTP framework), Node.js |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (production via Railway; also supported locally) |
| Auth | JWT, bcryptjs |
| Shared types | `packages/shared` — DTOs, enums, and API error types shared across apps |
| Monorepo | npm workspaces |
| Testing | Vitest (API), Jest + React Testing Library (web), Playwright (E2E) |
| Linting | ESLint — 0 errors, 0 `eslint-disable` directives |
| Type safety | TypeScript strict mode — 0 errors, 0 `any` usage |
| CI/CD | GitHub Actions (lint → typecheck → API tests → web tests → E2E) |
| Deployment | Railway (API), Vercel (web) |

---

## 4. Architecture

```
rapid-ledger/
├── apps/
│   ├── api/                  # Elysia backend (port 3001)
│   │   └── src/
│   │       ├── routes/       # Thin HTTP handlers — no business logic
│   │       ├── services/     # Business logic: validation, documents, audit, ledger
│   │       ├── repositories/ # All Prisma/DB access — routes never touch DB directly
│   │       ├── validators/   # Zod schemas centralised and reused across routes and tests
│   │       ├── lib/          # Prisma singleton, JWT helpers, rate limiter
│   │       └── types/        # Domain types and DTOs
│   └── web/                  # Next.js 16 frontend (port 3000)
│       └── app/
│           ├── (auth)/       # Login page
│           ├── dashboard/    # Document list and search
│           ├── documents/    # New document wizard, document detail
│           ├── approvals/    # Approval queue
│           ├── ledger/       # Immutable finalised records
│           ├── audit-log/    # Append-only audit trail
│           └── admin/        # User management (admin only)
├── packages/
│   └── shared/               # Shared TypeScript types, DTOs, and enums
│       └── src/types/
│           ├── models.ts     # RapidDocument, LedgerEntry, AuditLog, ApiError
│           └── enums.ts      # RiskLevel, DocumentStatus, AuditAction (re-exported from Prisma)
├── prisma/
│   ├── schema.prisma         # Single source of truth — one schema, used by both apps and seed
│   ├── migrations/           # Versioned migration history (3 migrations)
│   └── seed.ts               # Deterministic seed with bcrypt-hashed passwords
├── docs/
│   ├── HLD.md                # High-level design
│   ├── LLD.md                # Low-level design
│   ├── GHERKIN.md            # BDD scenarios
│   ├── API.md                # API reference
│   └── TEST_PLAN.md          # Test strategy and coverage
└── package.json              # Root workspace config
```

### Key Design Decisions

- **Business rules enforced at the service layer** — `services/validation.service.ts` enforces Decide owner, Agree requirement, and evidence rules. Routes are thin HTTP handlers only.
- **Repository pattern** — all Prisma calls are isolated in `repositories/`; routes and services never import `prisma` directly outside `lib/`.
- **Centralised validation** — Zod schemas live in `validators/` and are imported by both routes and tests, eliminating duplication.
- **Self-contained API tests** — tests use Elysia's `app.handle()` directly. No running server, no port conflicts, no manual setup.
- **Single Prisma schema** — `prisma/schema.prisma` at the root is the only schema file. The API, web app, and seed all reference this one file.
- **Shared types package** — `packages/shared` exports TypeScript types and enums imported by both `apps/api` and `apps/web`, so a schema or DTO change propagates everywhere via one edit.
- **Zero `any` policy** — TypeScript strict mode is enforced across both apps. There are zero `any` usages and zero `eslint-disable` directives in the codebase.
- **Rate limiting** — `/auth/login` is protected with an in-memory rate limiter to prevent brute-force attacks.

---

## 5. Local Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20.0.0 |
| npm | >= 10.0.0 |
| PostgreSQL | >= 14 |

### Clone and install

```bash
git clone https://github.com/harshiniramasamy5-star/rapid-ledger.git
cd rapid-ledger
npm install
```

`npm install` from the root installs all workspace dependencies (`apps/api`, `apps/web`, `packages/shared`) and automatically runs `prisma generate` via the postinstall hook.

---

## 6. Environment Variables

### API (`apps/api`)

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/rapid_ledger` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `your-super-secret-key-here-minimum-32` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |

### Web (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |

---

## 7. Database Setup

### Create and migrate

```bash
# Create the database
createdb rapid_ledger

# Apply all migrations
npm run db:migrate

# Seed demo users and documents
npm run db:seed
```

The seed creates 6 users across all roles and 3 demo documents at different workflow stages.

### Useful database commands

```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Create and apply a new migration
npm run db:studio     # Open Prisma Studio (visual DB browser)
npm run db:reset      # Reset DB and reseed (development only — destructive)
```

---

## 8. Running the App

### Start both servers from root (recommended)

```bash
npm run dev
```

This starts the API on port 3001 and the web app on port 3000 concurrently.

### Start individually

```bash
# API only
cd apps/api && npm run dev

# Web only
cd apps/web && npm run dev
```

Open http://localhost:3000 and log in with any credential from [Section 10](#10-demo-credentials).

---

## 9. Running Tests

### All tests from root

```bash
npm test
```

### Backend API tests (Vitest) — 31 tests

```bash
cd apps/api && npm test
```

| Suite | Coverage |
|-------|----------|
| `validation.test.ts` | Business rules: Decide owner requirement, Agree enforcement for high-risk, evidence requirement for compliance-impacting documents, rejection of invalid transitions |
| `rbac.test.ts` | Role-based access control — every role/endpoint combination tested including adversarial cases |
| `api.test.ts` | Full document lifecycle: create → submit → approve → finalise → version; audit event emission; ledger entry creation |

All API tests use Elysia's `app.handle()` directly — **no running server required**, no port conflicts, deterministic results.

### Frontend tests (Jest + React Testing Library) — 10 tests

```bash
cd apps/web && npm test
```

Covers component rendering, loading states, and user interactions across dashboard, document detail, and approval pages.

### E2E tests (Playwright) — 12 tests

```bash
cd apps/web && npx playwright test
```

Runs against the live Vercel deployment. Covers: authentication flows, redirect enforcement, role-based page access, adversarial API calls (unauthenticated requests, wrong-role actions), and audit log verification.

See [Known Limitations](#13-known-limitations) for details on the multi-actor workflow spec.

### Typecheck and lint

```bash
npm run typecheck   # 0 errors — strict mode, both apps
npm run lint        # 0 errors, 0 eslint-disable directives
```

---

## 10. Demo Credentials

All passwords are `password123`.

| Name | Email | Role | Can do |
|------|-------|------|--------|
| Alice Admin | admin@rapid.dev | admin | Everything — manage users, view all documents, finalise, access audit log |
| Carol Creator | creator@rapid.dev | creator | Create and submit RAPID documents |
| Rick Recommender | recommender@rapid.dev | recommender | Add recommendations to assigned documents |
| Bob Approver | approver@rapid.dev | approver | Approve, reject, or request changes on documents |
| Pam Performer | performer@rapid.dev | performer | Execute finalised documents and mark as `execution_complete` |
| Vera Viewer | viewer@rapid.dev | viewer | Read-only access to documents and ledger |

> **Auditor account:** No auditor is seeded by default. Create one via the Admin panel: log in as `admin@rapid.dev` → Admin → Create User → set role to Auditor.

---

## 11. Core Workflows

### Workflow A — Standard approval flow

1. Log in as `creator@rapid.dev`
2. Click **+ New Document** on the dashboard
3. Complete the 3-step wizard: details → RAPID role assignments (assign a Decide owner) → evidence
4. Click **Submit for Approval** — server validates all RAPID rules before accepting
5. Log in as `approver@rapid.dev` → Go to **Approvals** → click **Approve**
6. Log in as `admin@rapid.dev` → Open the document → click **Finalise**
7. Go to **Ledger** — the finalised record appears as a permanent, immutable entry

### Workflow B — High-risk decision (Agree enforced)

1. Log in as `creator@rapid.dev`
2. Create a document with risk level **High** or **Critical**
3. Assign at least one **Agree** role — submission is rejected without it (server-side)
4. If `complianceImpact` is checked, attach at least one evidence item — submission is rejected without it
5. Submit → log in as `approver@rapid.dev` → Approve
6. Log in as `admin@rapid.dev` → Finalise

### Workflow C — Execution completion

1. Log in as `admin@rapid.dev` → Finalise a document
2. Log in as `performer@rapid.dev`
3. Open the finalised document → click **Mark Execution Complete**
4. Status changes to `execution_complete`; an audit event is emitted with actor and timestamp
5. Go to **Audit Log** to verify the event is recorded

### Workflow D — Versioning

1. Log in as `admin@rapid.dev`
2. Open any **Finalised** document
3. Click **Create New Version**
4. A new draft is created with the same `documentCode` (e.g. `RAPID-003`) and an incremented version number
5. The original document remains locked — it cannot be edited or re-finalised

### Workflow E — Audit trail

1. Log in as `admin@rapid.dev`
2. Go to **Audit Log**
3. Every login, document creation, submission, approval, rejection, finalisation, versioning, and execution completion event is listed with actor, timestamp, and metadata
4. The audit log is append-only — no entries can be deleted or modified

---

## 12. API Overview

Base URL: `http://localhost:3001` (local) or `https://rapid-ledger-production.up.railway.app` (production)

Full reference: [`docs/API.md`](docs/API.md)

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Returns JWT token and `user` object. Rate limited. |
| GET | `/auth/me` | Returns current authenticated user |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List documents (filtered by role) |
| POST | `/documents` | Create new RAPID document |
| GET | `/documents/:id` | Get document detail |
| PATCH | `/documents/:id` | Update draft document (rejected if finalised) |
| POST | `/documents/:id/submit` | Submit for approval — validates all RAPID business rules |
| POST | `/documents/:id/approve` | Approve document (approver role required) |
| POST | `/documents/:id/reject` | Reject document (approver role required) |
| POST | `/documents/:id/finalise` | Finalise document — creates immutable ledger entry |
| POST | `/documents/:id/version` | Create new version from finalised document |
| POST | `/documents/:id/execution-complete` | Mark execution complete (performer role required) |

### Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ledger` | List all immutable ledger entries |
| GET | `/ledger/:id` | Get single ledger entry |

### Audit Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit` | List all audit events (admin/auditor only) |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| POST | `/users` | Create new user |
| PATCH | `/users/:id` | Update user |
| PATCH | `/users/:id/deactivate` | Deactivate user |

---

## 13. Known Limitations

### Multi-actor E2E workflow test in CI

The full create → submit → approve → finalise workflow requires three separate authenticated sessions (creator, approver, decider). This is correct RBAC behaviour — not a bug. A single Playwright session cannot walk the full workflow end-to-end because a user cannot finalise their own submission. This test (`workflow.spec.ts`) passes locally against a seeded database. The 12 other E2E tests (auth, role enforcement, adversarial API calls, audit log) run reliably in CI and pass.

Details: [`apps/web/e2e/README.md`](apps/web/e2e/README.md)

### Evidence is URL-based only

Evidence items store a URL or file reference. Direct file upload to object storage (S3, Cloudflare R2) is not implemented. This is a planned future improvement.

### No email notifications

Approvers and decision owners are not notified by email when a document is assigned or submitted. Notification integration is a future improvement.

### Railway cold start

The Railway API server (free tier) sleeps after inactivity. The first request after a period of inactivity may take 3–5 seconds to respond. Hit the `/health` endpoint before demoing to wake the server.

---

## 14. Future Improvements

- [ ] HttpOnly cookie auth (replace localStorage JWT for XSS hardening)
- [ ] File upload support for evidence (S3 / Cloudflare R2)
- [ ] Email notifications for approvals and assignments (SendGrid / Resend)
- [ ] Dashboard analytics — decisions by risk level, approval times, department breakdown
- [ ] PDF export of finalised RAPID documents
- [ ] Slack / Teams integration for governance notifications
- [ ] Multi-organisation support with workspace isolation
- [ ] Two-factor authentication for admin accounts
- [ ] Pagination on document and audit log lists

---

## Documentation

| Document | Description |
|----------|-------------|
| [HLD](docs/HLD.md) | High-level system design and component diagram |
| [LLD](docs/LLD.md) | Low-level design: DB schema, API contracts, service interfaces |
| [GHERKIN](docs/GHERKIN.md) | BDD scenarios for all RAPID workflow paths |
| [API Reference](docs/API.md) | Full API endpoint documentation with request/response examples |
| [Test Plan](docs/TEST_PLAN.md) | Test strategy, coverage matrix, and test environment setup |

---

*Built by Harshini Ramasamy — First Year CSE, NIT Warangal. Internship project, May 2026.*

*Stack: TypeScript · Next.js 16 · Elysia · Prisma 5 · PostgreSQL · npm workspaces · Vitest · Playwright · GitHub Actions · Railway · Vercel*
