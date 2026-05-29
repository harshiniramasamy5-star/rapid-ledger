![CI](https://github.com/harshiniramasamy5-star/rapid-ledger/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tests](https://img.shields.io/badge/tests-41%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

# RAPID Ledger

> Decision governance without compromise.

RAPID Ledger is a **production-grade, full-stack governance platform** that enforces the RAPID decision framework across an organisation. Every significant decision gets exactly one accountable owner, mandatory approvals, evidence trails, and an immutable ledger — making governance auditable, structured, and enforceable at the server level, not just the UI.

**[Live Demo →](https://rapid-ledger.vercel.app)** | **[API →](https://rapid-ledger-production.up.railway.app/health)** | **[Docs →](docs/)**

---

## Project Highlights

| | |
|---|---|
| **41 tests** | 31 API (Vitest) · 10 frontend (Jest) · 12 E2E (Playwright) |
| **0 TypeScript errors** | Strict mode enforced across both apps, zero `any` usage |
| **0 lint errors** | Zero `eslint-disable` directives anywhere in the codebase |
| **6 RBAC roles** | Admin · Creator · Recommender · Approver · Performer · Viewer |
| **5 workflow stages** | Draft → Awaiting Agreement → Approved → Finalised → Execution Complete |
| **Full audit trail** | Every action logged with actor, timestamp, and metadata |
| **Live deployment** | Railway (API) + Vercel (frontend) + PostgreSQL |
| **Green CI** | GitHub Actions: lint → typecheck → API tests → web tests → E2E |

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

RAPID is a decision-making framework used by organisations to eliminate ambiguity in high-stakes decisions by assigning explicit, non-overlapping roles:

| Letter | Role | Responsibility |
|--------|------|----------------|
| **R** | Recommend | Proposes the decision with supporting analysis |
| **A** | Agree | Must approve before the decision proceeds (required for high-risk decisions) |
| **P** | Perform | Executes the decision once finalised and marks it complete |
| **I** | Input | Provides information or expertise |
| **D** | Decide | The single accountable owner — exactly one per document |

### Business Rules Enforced Server-Side

These rules are enforced in `services/validation.service.ts` — not in the frontend, not in middleware. They are validated at the service layer on every state transition:

- **Exactly one Decide owner** required before submission — server rejects without it
- **High-risk and critical decisions** require at least one Agree approver — server rejects without it
- **Compliance-impacting decisions** require attached evidence — server rejects without it
- **Finalised documents are immutable** — PATCH is rejected with 403 once status is `finalised`
- **Ledger entries are permanent** — no delete or mutation endpoints exist
- **Versioning preserves identity** — new version keeps same `documentCode`, increments version number only
- **Audit logs are append-only** — no update or delete endpoints on audit records
- **Execution completion is tracked** — Performers mark finalised documents as `execution_complete`, emitting an audit event

---

## 2. Live Demo

> **Before demoing:** Wake the Railway server first (free tier sleeps after inactivity):
> ```
> curl https://rapid-ledger-production.up.railway.app/health
> ```
> Wait for `{"status":"ok"}` before opening the frontend.

| Service | URL |
|---------|-----|
| Frontend | https://rapid-ledger.vercel.app |
| Backend API | https://rapid-ledger-production.up.railway.app |
| Health check | https://rapid-ledger-production.up.railway.app/health |

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React, TypeScript (strict), shadcn/ui, Tailwind CSS |
| Backend | Elysia (TypeScript HTTP framework), Node.js |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (production via Railway) |
| Auth | JWT, bcryptjs, in-memory rate limiting on `/auth/login` |
| Shared types | `packages/shared` — DTOs, enums, ApiError shared across both apps |
| Monorepo | npm workspaces |
| Testing | Vitest (API) · Jest + React Testing Library (web) · Playwright (E2E) |
| Linting | ESLint — 0 errors, 0 `eslint-disable` directives |
| Type safety | TypeScript strict mode — 0 errors, 0 `any` |
| CI/CD | GitHub Actions — lint → typecheck → API tests → web tests → E2E |
| Deployment | Railway (API) · Vercel (frontend) |

---

## 4. Architecture

```
rapid-ledger/
├── apps/
│   ├── api/                  # Elysia backend (port 3001)
│   │   └── src/
│   │       ├── routes/       # Thin HTTP handlers — no business logic
│   │       ├── services/     # All business logic: validation, documents, audit, ledger
│   │       ├── repositories/ # All Prisma/DB access — routes never touch DB directly
│   │       ├── validators/   # Zod schemas centralised, reused across routes and tests
│   │       ├── lib/          # Prisma singleton, JWT helpers, rate limiter
│   │       └── types/        # Domain types and DTOs
│   └── web/                  # Next.js 16 frontend (port 3000)
│       └── app/
│           ├── (auth)/       # Login page
│           ├── dashboard/    # Document list, search, stats
│           ├── documents/    # 3-step new document wizard, document detail
│           ├── approvals/    # Approval queue
│           ├── ledger/       # Immutable finalised records
│           ├── audit-log/    # Append-only audit trail
│           └── admin/        # User management (admin only)
├── packages/
│   └── shared/               # Shared TypeScript types, DTOs, and enums
│       └── src/types/
│           ├── models.ts     # RapidDocument, LedgerEntry, AuditLog, ApiError
│           └── enums.ts      # RiskLevel, DocumentStatus, AuditAction
├── prisma/
│   ├── schema.prisma         # Single source of truth — one schema for all apps
│   ├── migrations/           # 3 versioned migrations
│   └── seed.ts               # Deterministic seed: 6 users + demo documents
├── docs/
│   ├── HLD.md                # High-level design
│   ├── LLD.md                # Low-level design
│   ├── GHERKIN.md            # BDD scenarios
│   ├── API.md                # Full API reference
│   └── TEST_PLAN.md          # Test strategy and coverage matrix
└── package.json              # Root workspace config
```

### Key Design Decisions

- **Service-layer business rules** — `validation.service.ts` enforces all RAPID constraints. Routes are thin HTTP handlers that delegate immediately to services.
- **Repository pattern** — all Prisma calls isolated in `repositories/`. No route or service imports `prisma` directly.
- **Centralised Zod validators** — schemas in `validators/` imported by both routes and tests, eliminating duplication and drift.
- **Self-contained API tests** — use Elysia's `app.handle()` directly. Zero server startup, zero port conflicts, deterministic.
- **Single Prisma schema** — one `prisma/schema.prisma` at root. No schema duplication anywhere.
- **Shared types package** — `packages/shared` imported by both apps. A DTO change propagates everywhere in one edit.
- **Zero `any` policy** — TypeScript strict mode across both apps. No exceptions, no suppressions.
- **Rate limiting** — in-memory rate limiter on `/auth/login` prevents brute-force attacks.
- **Atomic transactions** — submit, approve, and finalise wrapped in Prisma transactions to prevent partial state.

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

`npm install` from root installs all workspace dependencies and runs `prisma generate` via the postinstall hook automatically.

---

## 6. Environment Variables

### API (`apps/api`)

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/rapid_ledger` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `your-super-secret-key-here-minimum-32` |
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

```bash
createdb rapid_ledger
npm run db:migrate
npm run db:seed
```

The seed creates 6 users across all RAPID roles and 3 demo documents at different workflow stages.

```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Create and apply a new migration
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset and reseed (destructive)
```

---

## 8. Running the App

```bash
npm run dev           # Start both servers from root (recommended)
```

API on port 3001 · Web on port 3000. Open http://localhost:3000.

---

## 9. Running Tests

```bash
npm test              # All tests from root
```

### API tests (Vitest) — 31 tests

```bash
cd apps/api && npm test
```

| Suite | Coverage |
|-------|----------|
| `validation.test.ts` | Decide owner enforcement, Agree requirement, evidence requirement, invalid transitions |
| `rbac.test.ts` | Every role/endpoint combination including adversarial cases |
| `api.test.ts` | Full lifecycle: create → submit → approve → finalise → version; audit emission; ledger creation |

All tests use Elysia's `app.handle()` — **no running server required**.

### Frontend tests (Jest) — 10 tests

```bash
cd apps/web && npm test
```

### E2E tests (Playwright) — 12 tests

```bash
cd apps/web && npx playwright test
```

Runs against live Vercel. Covers: auth, redirects, RBAC, adversarial API calls, audit log.

```bash
npm run typecheck     # 0 errors — strict mode across both apps
npm run lint          # 0 errors, 0 eslint-disable directives
```

---

## 10. Demo Credentials

All passwords: `password123`

| Name | Email | Role | Capabilities |
|------|-------|------|--------------|
| Alice Admin | admin@rapid.dev | admin | Full access — manage users, finalise, audit log |
| Bob Approver | approver@rapid.dev | approver | Approve, reject, request changes on documents |
| Carol Creator | creator@rapid.dev | creator | Create and submit RAPID documents |
| Pam Performer | performer@rapid.dev | performer | Mark finalised documents as execution complete |
| Rick Recommender | recommender@rapid.dev | recommender | When assigned the R — Recommend role, can submit recommendation notes before a decision is approved |
| Vera Viewer | viewer@rapid.dev | viewer | Not just a viewer — when assigned the I — Input role on a document, can actively submit input notes and expertise before the decision is approved |

---

## 11. Core Workflows

### A — Standard approval
1. `creator@rapid.dev` → **+ New Document** → assign all roles → Submit
2. `approver@rapid.dev` → **Approvals** → Approve
3. `admin@rapid.dev` → Finalise → **Ledger** → **Audit Log**

### F — Recommendation and Input
1. `creator@rapid.dev` → create and submit document → assign Rick as R, Vera as I
2. `recommender@rapid.dev` → open document → **Submit Recommendation**
3. `viewer@rapid.dev` → open document → **Submit Input**
4. Both recorded in Audit Log with actor and timestamp

### B — High-risk (server enforces Agree)
1. Create document with risk **High** or **Critical**
2. Submit without Agree role → server rejects
3. Assign Agree role → submit succeeds → approve → finalise

### C — Execution completion
1. `admin@rapid.dev` → Finalise document
2. `performer@rapid.dev` → **Mark Execution Complete**
3. Audit event emitted → verify in **Audit Log**

### D — Versioning
1. `admin@rapid.dev` → open Finalised document → **Create New Version**
2. Same `documentCode`, incremented version — original locked permanently

### E — Audit trail
1. `admin@rapid.dev` → **Audit Log**
2. Every action recorded: actor, role, timestamp, document code — append-only

---

## 12. API Overview

Base URL: `http://localhost:3001` · `https://rapid-ledger-production.up.railway.app`

Full reference: [`docs/API.md`](docs/API.md)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | JWT + user object. Rate limited. |
| GET | `/auth/me` | Current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List (role-filtered) |
| POST | `/documents` | Create |
| GET | `/documents/:id` | Detail |
| PATCH | `/documents/:id` | Update draft (403 if finalised) |
| POST | `/documents/:id/submit` | Submit — validates all RAPID rules |
| POST | `/documents/:id/approve` | Approve (approver role) |
| POST | `/documents/:id/reject` | Reject (approver role) |
| POST | `/documents/:id/finalise` | Finalise — creates ledger entry |
| POST | `/documents/:id/version` | New version |
| POST | `/documents/:id/recommend` | Submit recommendation notes (recommend role required) |
| POST | `/documents/:id/input` | Submit input notes and expertise (input role required) |
| POST | `/documents/:id/execution-complete` | Mark complete (performer role) |

### Ledger
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ledger` | All immutable entries |
| GET | `/ledger/:id` | Single entry |

### Audit Log
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit` | All events (admin/auditor only) |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List |
| POST | `/users` | Create |
| PATCH | `/users/:id` | Update |
| PATCH | `/users/:id/deactivate` | Deactivate |

---

## 13. Known Limitations

**Multi-actor E2E in CI** — The full create → approve → finalise flow requires three separate authenticated sessions, which is correct RBAC behaviour. A single Playwright session cannot walk this flow. The 12 other E2E tests pass reliably in CI. Details: [`apps/web/e2e/README.md`](apps/web/e2e/README.md)

**Evidence is URL-based** — Direct file upload (S3/R2) not implemented.

**No email notifications** — Approvers are not notified on assignment.

**Railway cold start** — Free tier sleeps after inactivity. Hit `/health` before demoing.

---

## 14. Future Improvements

- [ ] HttpOnly cookie auth (XSS hardening)
- [ ] File upload for evidence (S3 / Cloudflare R2)
- [ ] Email notifications (SendGrid / Resend)
- [ ] Dashboard analytics
- [ ] PDF export of finalised documents
- [ ] Slack / Teams integration
- [ ] Multi-organisation support
- [ ] Two-factor authentication
- [ ] Pagination on lists

---

## Documentation

| Document | Description |
|----------|-------------|
| [HLD](docs/HLD.md) | High-level design |
| [LLD](docs/LLD.md) | Low-level design: schema, API contracts, service interfaces |
| [GHERKIN](docs/GHERKIN.md) | BDD scenarios |
| [API Reference](docs/API.md) | Full API docs with examples |
| [Test Plan](docs/TEST_PLAN.md) | Test strategy and coverage matrix |

---

*Built by Harshini Ramasamy — First Year CSE, NIT Warangal · Internship Project, May 2026*

*TypeScript · Next.js 16 · Elysia · Prisma 5 · PostgreSQL · npm workspaces · Vitest · Playwright · GitHub Actions · Railway · Vercel*
