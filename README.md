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
| **P** | Perform | Executes the decision once finalised |
| **I** | Input | Provides information or expertise |
| **D** | Decide | The single accountable owner — exactly one per document |

### Business Rules Enforced

- **Exactly one Decide owner** is required before a document can be submitted
- **High-risk and critical decisions** require at least one Agree approver
- **Compliance-impacting decisions** require attached evidence before submission
- **Finalised documents are immutable** — no edits after finalisation
- **Ledger entries are permanent** — no deletion or mutation endpoints exist
- **Versioning preserves identity** — a new version keeps the same document code and increments the version number
- **Audit logs are append-only** — every significant action is recorded with actor, timestamp, and metadata

---

## 2. Live Demo

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
| Frontend | Next.js 16, React, TypeScript, shadcn/ui, Tailwind CSS |
| Backend | Elysia (TypeScript HTTP framework), Node.js |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (production via Railway), SQLite (local dev) |
| Auth | JWT (RS256), bcryptjs |
| Monorepo | npm workspaces |
| Testing | Vitest, React Testing Library (Jest), Playwright |
| Linting | ESLint, TypeScript strict mode |
| Deployment | Railway (API), Vercel (web) |

---

## 4. Architecture

```
rapid-ledger/
├── apps/
│   ├── api/                  # Elysia backend (port 3001)
│   │   └── src/
│   │       ├── routes/       # Thin HTTP handlers only
│   │       ├── services/     # Business logic
│   │       ├── repositories/ # All Prisma/DB access
│   │       ├── validators/   # Zod schemas reused across routes and tests
│   │       ├── lib/          # Prisma singleton, JWT helpers
│   │       └── types/        # Domain types, DTOs
│   └── web/                  # Next.js 16 frontend (port 3000)
│       └── app/
│           ├── (auth)/       # Login page
│           ├── dashboard/    # Document list + search
│           ├── documents/    # New document wizard, document detail
│           ├── approvals/    # Approval queue
│           ├── ledger/       # Immutable finalised records
│           ├── audit-log/    # Append-only audit trail
│           └── admin/        # User management (admin only)
├── packages/
│   └── shared/               # Shared TypeScript types and DTOs
├── prisma/
│   ├── schema.prisma         # Single source of truth for DB schema
│   ├── migrations/           # Versioned migration history
│   └── seed.ts               # Deterministic seed with bcrypt
├── docs/
│   ├── HLD.md                # High-level design
│   ├── LLD.md                # Low-level design
│   ├── GHERKIN.md            # BDD scenarios
│   ├── API.md                # API reference
│   └── TEST_PLAN.md          # Test strategy and coverage
└── package.json              # Root workspace config
```

### Key Design Decisions

- **Validation at the service layer** — business rules (Decide owner, Agree enforcement, evidence requirement) are enforced in `services/validation.service.ts`, not in routes or the frontend
- **Repository pattern** — all Prisma calls are isolated in `repositories/`; routes never access the DB client directly
- **Self-contained tests** — API tests use Elysia's `app.handle()` directly; no running server required, no port conflicts
- **Single Prisma schema** — `prisma/schema.prisma` at the root is the only schema file; both the API and seed import from this location

---

## 5. Local Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20.0.0 |
| npm | >= 10.0.0 |
| PostgreSQL | >= 14 (or use the included SQLite for local dev) |

### Clone and install

```bash
git clone https://github.com/harshiniramasamy5-star/rapid-ledger.git
cd rapid-ledger
npm install
```

`npm install` from the root installs all workspace dependencies and automatically runs `prisma generate` via the postinstall hook.

---

## 6. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/rapid_ledger` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `your-super-secret-key-here-minimum-32` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |

For the web app:

```bash
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |

---

## 7. Database Setup

### Option A — PostgreSQL (recommended)

```bash
# Create the database
createdb rapid_ledger

# Apply migrations
npm run db:migrate

# Seed demo users and documents
npm run db:seed
```

### Option B — SQLite (quick local dev)

Change `provider` in `prisma/schema.prisma` from `postgresql` to `sqlite` and set:

```
DATABASE_URL="file:./dev.db"
```

Then:

```bash
npm run db:push
npm run db:seed
```

### Useful database commands

```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Create and apply a new migration
npm run db:studio     # Open Prisma Studio (visual DB browser)
npm run db:reset      # Reset DB and reseed (development only — destructive)
```

---

## 8. Running the App

### Start both servers (recommended)

```bash
npm run dev
```

This starts the API (port 3001) and web app (port 3000) concurrently.

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

### Backend tests (Vitest)

```bash
cd apps/api && npm test
```

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `validation.test.ts` | 18 | Business rules: Decide owner, Agree enforcement, evidence requirement |
| `rbac.test.ts` | 27 | Role-based access control across all endpoints |
| `api.test.ts` | 13 | Document lifecycle, approval flow, versioning |

Tests use Elysia's `app.handle()` — no running server required.

### Frontend tests (Jest + React Testing Library)

```bash
cd apps/web && npm test
```

17 tests covering component rendering and user interactions.

### E2E tests (Playwright)

```bash
cd apps/web && npx playwright test
```

9 end-to-end tests covering the full RAPID workflow. See [Known Limitations](#13-known-limitations) for hardware requirements.

### Typecheck and lint

```bash
npm run typecheck   # 0 errors expected
npm run lint        # 0 errors expected
```

---

## 10. Demo Credentials

All passwords are `password123`.

| Name | Email | Role | Can do |
|------|-------|------|--------|
| Alice Admin | admin@rapid.dev | admin | Everything — manage users, view all documents, access audit log |
| Carol Creator | creator@rapid.dev | creator | Create and submit RAPID documents |
| Rick Recommender | recommender@rapid.dev | recommender | Add recommendations to assigned documents |
| Bob Approver | approver@rapid.dev | approver | Approve, reject, or request changes on documents |
| Pam Performer | performer@rapid.dev | performer | Execute and mark completion on finalised documents |
| Vera Viewer | viewer@rapid.dev | viewer | Read-only access to documents |

> **Auditor account:** No auditor is seeded by default. Create one via the Admin panel: log in as `admin@rapid.dev` → Admin → Create User → set role to Auditor.

---

## 11. Core Workflows

### Workflow A — Standard approval flow

1. Log in as `creator@rapid.dev`
2. Click **+ New Document** on the dashboard
3. Complete the 3-step wizard: details → RAPID role assignments (assign a Decide owner) → evidence
4. Click **Submit for Approval**
5. Log in as `approver@rapid.dev`
6. Go to **Approvals** → click **Approve** with notes
7. Log in as `admin@rapid.dev`
8. Open the document → click **Finalise**
9. Go to **Ledger** — the finalised record appears as a permanent, immutable entry

### Workflow B — High-risk decision (Agree enforced)

1. Log in as `creator@rapid.dev`
2. Create a document with risk level **High** or **Critical**
3. Assign at least one **Agree** role — submission is blocked without it
4. If `complianceImpact` is checked, attach at least one evidence item — submission is blocked without it
5. Submit → log in as `approver@rapid.dev` → Approve
6. Log in as `admin@rapid.dev` → Finalise

### Workflow C — Versioning

1. Log in as `admin@rapid.dev`
2. Open any **Finalised** document
3. Click **Create New Version**
4. A new draft is created with the same `documentCode` and an incremented version number
5. The original document is locked — it cannot be edited or re-finalised

### Workflow D — Audit trail

1. Log in as `admin@rapid.dev`
2. Go to **Audit Log**
3. Every login, document creation, submission, approval, finalisation, and versioning event is listed with actor, timestamp, and metadata

---

## 12. API Overview

Base URL: `http://localhost:3001` (local) or `https://rapid-ledger-production.up.railway.app` (production)

Full reference: [`docs/API.md`](docs/API.md)

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Returns JWT token and user object |
| GET | `/auth/me` | Returns current authenticated user |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List documents (filtered by role) |
| POST | `/documents` | Create new RAPID document |
| GET | `/documents/:id` | Get document detail |
| PATCH | `/documents/:id` | Update draft document |
| POST | `/documents/:id/submit` | Submit for approval (validates RAPID rules) |
| POST | `/documents/:id/approve` | Approve document (approver role required) |
| POST | `/documents/:id/reject` | Reject document |
| POST | `/documents/:id/finalise` | Finalise document (creates ledger entry) |
| POST | `/documents/:id/version` | Create new version from finalised document |

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

### Playwright E2E tests require high RAM

Running Next.js dev server + Elysia API + Playwright browser concurrently requires approximately 3 GB of RAM. On low-memory machines this causes system slowdowns. The tests are correctly written and configured — run them via GitHub Actions CI for reliable execution.

### JWT stored in localStorage

The authentication token is stored in `localStorage` for simplicity. This is vulnerable to XSS attacks. In a production system this should be replaced with HttpOnly cookies. Documented here as a known architectural trade-off for this internship scope.

### Evidence is URL-based only

Evidence items store a URL or file path. Direct file upload to object storage (S3, Cloudflare R2) is not implemented. This is a planned future improvement.

### No email notifications

Approvers and decision owners are not notified by email when a document is assigned or submitted. Notification integration (SendGrid, Resend) is a future improvement.

---

## 14. Future Improvements

- [ ] Playwright E2E via GitHub Actions CI pipeline
- [ ] HttpOnly cookie auth (replace localStorage JWT)
- [ ] File upload support for evidence (S3 / Cloudflare R2)
- [ ] Email notifications for approvals and assignments
- [ ] Dashboard analytics — decisions by risk level, approval times, department breakdown
- [ ] PDF export of finalised RAPID documents
- [ ] Slack / Teams integration for governance notifications
- [ ] Multi-organisation support with workspace isolation
- [ ] Two-factor authentication for admin accounts

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

*Built as an internship project demonstrating production-grade governance engineering with TypeScript, Next.js 16, Elysia, Prisma, and PostgreSQL.*
