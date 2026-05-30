![CI](https://github.com/harshiniramasamy5-star/rapid-ledger/actions/workflows/ci.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tests](https://img.shields.io/badge/tests-41%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)
![Railway](https://img.shields.io/badge/Railway-deployed-blueviolet)
![Vercel](https://img.shields.io/badge/Vercel-live-black)

<br/>

<div align="center">

# ⚖️ RAPID Ledger

### *Decision governance without compromise.*

**A production-grade, full-stack governance platform that enforces the RAPID decision framework — with server-side business rules, role-based access control, an immutable ledger, and a complete audit trail. Built in under 30 days as a first-year CSE internship project.**

**[🚀 Live Demo](https://rapid-ledger.vercel.app)** · **[🔌 API Health](https://rapid-ledger-production.up.railway.app/health)** · **[📚 Docs](docs/)**

</div>

---

## ✨ Project Highlights

| Metric | Value |
|--------|-------|
| 🧪 **Total tests** | 45 — 35 API (Vitest) · 10 frontend (Jest) · 12 E2E (Playwright) |
| 🔷 **TypeScript errors** | **0** — strict mode across both apps, zero `any` usage |
| 🧹 **Lint errors** | **0** — zero `eslint-disable` directives, zero warnings |
| 🔐 **RBAC roles** | 6 — Admin · Creator · Recommender · Approver · Performer · Viewer |
| 📋 **Workflow stages** | 5 — Draft → Awaiting Agreement → Approved → Finalised → Execution Complete |
| 🔒 **Immutability** | Finalised documents are permanently locked — `PATCH` rejected with 403 |
| 📜 **Audit trail** | Every action logged with actor, timestamp, and metadata — append-only |
| 📊 **Analytics** | Live dashboard charts — status distribution, risk levels, department breakdown |
| 📄 **PDF Export** | Finalised RAPID documents exportable as professionally formatted PDFs |
| 🔑 **Account Security** | 5-strike lockout (30 min), failed login audit trail, inactive account blocking |
| 📑 **Pagination** | Server-side pagination on documents and ledger — `page`, `limit`, `total`, `totalPages` |
| 🚀 **Deployment** | Railway (API) + Vercel (frontend) + PostgreSQL — live, always on |
| ✅ **CI/CD** | GitHub Actions — lint → typecheck → API tests → web tests → E2E |

---

## 📑 Table of Contents

1. [What is RAPID?](#1-what-is-rapid)
2. [Live Demo](#2-live-demo)
3. [System Architecture](#3-system-architecture)
4. [Document Lifecycle](#4-document-lifecycle)
5. [Tech Stack](#5-tech-stack)
6. [Folder Structure](#6-folder-structure)
7. [Key Design Decisions](#7-key-design-decisions)
8. [Local Setup](#8-local-setup)
9. [Environment Variables](#9-environment-variables)
10. [Database Setup](#10-database-setup)
11. [Running the App](#11-running-the-app)
12. [Running Tests](#12-running-tests)
13. [Demo Credentials](#13-demo-credentials)
14. [Core Workflows](#14-core-workflows)
15. [API Reference](#15-api-reference)
16. [Known Limitations](#16-known-limitations)
17. [Future Improvements](#17-future-improvements)

---

## 1. What is RAPID?

RAPID is a battle-tested decision-making framework used by organisations to eliminate ambiguity in high-stakes decisions by assigning explicit, non-overlapping roles to every participant.

```mermaid
graph LR
    R["🔵 R — Recommend\nProposes the decision\nwith analysis"]
    A["🟠 A — Agree\nMust approve before\nthe decision proceeds"]
    P["🟢 P — Perform\nExecutes the decision\nonce finalised"]
    I["🟣 I — Input\nProvides expertise\nor information"]
    D["🔴 D — Decide\nThe single accountable\nowner — exactly one"]

    R --> D
    A --> D
    I --> D
    D --> P
```

### Business Rules Enforced at the Server Layer

These rules live in `services/validation.service.ts` — not in the frontend, not in middleware. Every state transition is validated server-side before any database write occurs:

- **Exactly one Decide owner** required before submission — server rejects without it
- **High-risk and critical decisions** require at least one Agree approver — server rejects without it
- **Compliance-impacting decisions** require attached evidence — server rejects without it
- **Finalised documents are immutable** — `PATCH` is rejected with `403` once status is `finalised`
- **Ledger entries are permanent** — no delete or mutation endpoints exist
- **Versioning preserves identity** — new version keeps same `documentCode`, increments version number only
- **Audit logs are append-only** — no update or delete endpoints on audit records
- **Execution completion is tracked** — Performers mark finalised documents as `execution_complete`, emitting a permanent audit event
- **Recommendation and Input are active roles** — R and I assignees submit notes, not merely read

---

## 2. Live Demo

> ⚠️ **Before demoing:** Wake the Railway server first — the free tier sleeps after inactivity:
> ```bash
> curl https://rapid-ledger-production.up.railway.app/health
> ```
> Wait for `{"status":"ok"}` before opening the frontend.

| Service | URL |
|---------|-----|
| 🌐 Frontend | https://rapid-ledger.vercel.app |
| 🔌 Backend API | https://rapid-ledger-production.up.railway.app |
| 💓 Health check | https://rapid-ledger-production.up.railway.app/health |

---

## 3. System Architecture

```mermaid
graph TB
    subgraph Client["🌐 Client — Vercel"]
        FE["Next.js 16\nReact + shadcn/ui\nTailwind CSS"]
    end

    subgraph Backend["🚂 Backend — Railway"]
        API["Elysia API\nNode.js"]
        MW["Auth Middleware\nJWT + Rate Limiter"]
        SVC["Service Layer\nBusiness Rules\nValidation"]
        REPO["Repository Layer\nPrisma ORM"]
    end

    subgraph Database["🗄️ Database — Railway PostgreSQL"]
        DB[("PostgreSQL\nDocuments · Users\nAudit Logs · Ledger")]
    end

    subgraph Shared["📦 packages/shared"]
        TYPES["TypeScript Types\nDTOs · Enums\nApiError"]
    end

    FE -->|"HTTPS REST"| API
    API --> MW --> SVC --> REPO --> DB
    FE -.->|"imports types"| TYPES
    API -.->|"imports types"| TYPES
```

### Request Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as Next.js
    participant MW as Auth Middleware
    participant SVC as Service Layer
    participant DB as PostgreSQL

    U->>FE: Submit document
    FE->>MW: POST /documents/:id/submit + JWT
    MW->>MW: Verify JWT, extract user
    MW->>SVC: Forward request + user context
    SVC->>SVC: Validate RAPID rules<br/>(Decide owner, Agree, Evidence)
    SVC->>DB: Atomic transaction<br/>(update + audit log)
    DB-->>SVC: Committed
    SVC-->>FE: 200 + updated document
    FE-->>U: Status updated ✅
```

---

## 4. Document Lifecycle

```mermaid
stateDiagram-v2
    [*] --> draft : Creator creates document

    draft --> awaiting_agreement : Creator submits\n(server validates RAPID rules)
    awaiting_agreement --> approved : Approver agrees
    awaiting_agreement --> needs_changes : Approver requests changes
    awaiting_agreement --> rejected : Approver rejects

    needs_changes --> awaiting_agreement : Creator resubmits
    rejected --> [*]

    approved --> finalized : Decide owner finalises\n(ledger entry created\ndocument becomes immutable)

    finalized --> execution_complete : Performer marks complete\n(audit event emitted)
    finalized --> draft : Create new version\n(same documentCode\nversion + 1)

    execution_complete --> [*]
```

### Role Actions by Stage

```mermaid
graph TD
    subgraph DRAFT["📝 Draft"]
        C1["Creator: Fill details,\nassign RAPID roles,\nattach evidence, submit"]
        R1["Recommender: Submit\nrecommendation notes"]
        I1["Input: Submit\nexpertise and input notes"]
    end

    subgraph AWAITING["⏳ Awaiting Agreement"]
        A1["Approver: Approve /\nRequest Changes / Reject"]
    end

    subgraph APPROVED["✅ Approved"]
        D1["Decide Owner:\nFinalise decision"]
    end

    subgraph FINALIZED["🔒 Finalised — Immutable"]
        P1["Performer: Mark\nexecution complete"]
        AD["Admin: Create\nnew version"]
    end

    DRAFT --> AWAITING --> APPROVED --> FINALIZED
```

---

## 5. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16, React, TypeScript (strict), shadcn/ui, Tailwind CSS | SSR, type safety, polished UI |
| **Backend** | Elysia (TypeScript HTTP framework), Node.js | Fast, type-safe, schema validation built in |
| **ORM** | Prisma 5.22 | Type-safe queries, migrations, single schema source |
| **Database** | PostgreSQL (production via Railway) | ACID transactions, production-grade reliability |
| **Auth** | JWT, bcryptjs, in-memory rate limiting | Secure, stateless, brute-force protected |
| **Shared types** | `packages/shared` — DTOs, enums, ApiError | One source of truth across both apps |
| **Monorepo** | npm workspaces | Single install, shared dependencies |
| **Testing** | Vitest (API) · Jest + RTL (web) · Playwright (E2E) | Full coverage: unit, integration, end-to-end |
| **Linting** | ESLint — 0 errors, 0 `eslint-disable` directives | Zero technical debt |
| **Type safety** | TypeScript strict mode — 0 errors, 0 `any` | No hidden bugs |
| **CI/CD** | GitHub Actions | Automated quality gate on every push |
| **Deployment** | Railway (API) · Vercel (frontend) | Zero-config, production-grade hosting |

---

## 6. Folder Structure

```
rapid-ledger/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions — lint → typecheck → test → E2E
├── apps/
│   ├── api/                    # Elysia backend (port 3001)
│   │   └── src/
│   │       ├── routes/         # Thin HTTP handlers — no business logic
│   │       ├── services/       # Business rules: validation, documents, audit, ledger
│   │       ├── repositories/   # All Prisma/DB access — never imported by routes directly
│   │       ├── validators/     # Zod schemas — shared by routes AND tests
│   │       ├── lib/            # Prisma singleton, JWT helpers, rate limiter
│   │       └── types/          # Domain types and DTOs
│   └── web/                    # Next.js 16 frontend (port 3000)
│       └── app/
│           ├── (auth)/         # Login page
│           ├── dashboard/      # Document list, search, stats
│           ├── documents/      # 3-step wizard, document detail with role actions
│           ├── approvals/      # Approval queue for Agree-role users
│           ├── ledger/         # Immutable finalised records
│           ├── audit-log/      # Append-only audit trail
│           └── admin/          # User management (admin only)
├── packages/
│   └── shared/                 # Shared TypeScript types, DTOs, and enums
│       └── src/types/
│           ├── models.ts       # RapidDocument, LedgerEntry, AuditLog, ApiError
│           └── enums.ts        # RiskLevel, DocumentStatus, AuditAction
├── prisma/
│   ├── schema.prisma           # Single source of truth — one schema, all apps
│   ├── migrations/             # 8 versioned migrations — full history preserved
│   └── seed.ts                 # Deterministic seed: 6 users + demo documents
├── docs/
│   ├── HLD.md                  # High-level design
│   ├── LLD.md                  # Low-level design: schema, API contracts, interfaces
│   ├── GHERKIN.md              # BDD scenarios for all workflow paths
│   ├── API.md                  # Full API reference with examples
│   └── TEST_PLAN.md            # Test strategy and coverage matrix
├── .env.example                # Root env example
└── package.json                # Root workspace config
```

---

## 7. Key Design Decisions

```mermaid
graph LR
    subgraph Route["HTTP Route\n(thin handler)"]
        RT["Receives request\nValidates auth\nDelegates immediately"]
    end

    subgraph Service["Service Layer\n(business rules)"]
        SV["Enforces RAPID rules\nDecide owner check\nAgree requirement\nEvidence requirement\nImmutability guard"]
    end

    subgraph Repo["Repository Layer\n(data access)"]
        RP["All Prisma queries\nAtomic transactions\nNo SQL in routes/services"]
    end

    subgraph DB["PostgreSQL"]
        D[("Single schema\nOne source of truth")]
    end

    RT --> SV --> RP --> D
```

| Decision | Rationale |
|----------|-----------|
| **Service-layer rules** | Business logic in `validation.service.ts` — routes are thin, testable, replaceable |
| **Repository pattern** | All Prisma calls isolated — DB implementation swappable without touching business logic |
| **Centralised Zod validators** | Schemas in `validators/` imported by both routes and tests — no duplication, no drift |
| **Self-contained API tests** | `app.handle()` — no running server, no ports, no flakiness |
| **Single Prisma schema** | One `schema.prisma` at root — no duplication, one migration history |
| **Shared types package** | `packages/shared` — a DTO change propagates to both apps in one edit |
| **Zero `any` policy** | TypeScript strict mode — bugs surface at compile time, not production |
| **Rate limiting** | In-memory limiter on `/auth/login` — brute-force protected |
| **Atomic transactions** | Submit, approve, and finalise wrapped in `prisma.$transaction()` — no partial state |

---

## 8. Local Setup

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

`npm install` from root installs all workspace dependencies (`apps/api`, `apps/web`, `packages/shared`) and automatically runs `prisma generate` via the postinstall hook.

---

## 9. Environment Variables

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

## 10. Database Setup

```bash
createdb rapid_ledger
npm run db:migrate
npm run db:seed
```

The seed creates 6 users across all RAPID roles and 3 demo documents at different workflow stages.

```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Create and apply a new migration
npm run db:studio     # Open Prisma Studio (visual DB browser)
npm run db:reset      # Reset and reseed (destructive — dev only)
```

---

## 11. Running the App

```bash
npm run dev           # Start both servers from root (recommended)
```

API on port 3001 · Web on port 3000. Open http://localhost:3000.

---

## 12. Running Tests

```bash
npm test              # All tests from root — 57 total
```

### API tests (Vitest) — 35 tests

```bash
cd apps/api && npm test
```

| Suite | What it proves |
|-------|----------------|
| `validation.test.ts` | RAPID business rules: Decide owner, Agree enforcement, evidence requirement, immutability, invalid transitions |
| `rbac.test.ts` | Every role/endpoint combination — including adversarial cases (wrong role, unauthenticated) |
| `api.test.ts` | Full document lifecycle: create → submit → approve → finalise → version; audit emission; ledger creation |

> All API tests use Elysia's `app.handle()` — **no running server required**, no port conflicts, fully deterministic.

### Frontend tests (Jest + RTL) — 10 tests

```bash
cd apps/web && npm test
```

Covers component rendering, loading states, and user interactions across dashboard, document detail, and approvals.

### E2E tests (Playwright) — 12 tests

```bash
cd apps/web && npx playwright test
```

Runs against the live Vercel deployment. Covers: auth flows, redirect enforcement, RBAC page access, adversarial API calls, audit log verification.

```bash
npm run typecheck     # 0 errors — strict mode, both apps
npm run lint          # 0 errors, 0 eslint-disable directives
```

---

## 13. Demo Credentials

All passwords: `password123`

| Name | Email | System Role | RAPID Capability |
|------|-------|-------------|-----------------|
| 👑 Alice Admin | admin@rapid.com | Admin | Full access — manage users, finalise documents, view audit log and ledger |
| ✍️ Carol Creator | creator@rapid.com | Creator | Create and submit RAPID documents, assign roles, attach evidence |
| 💬 Rick Recommender | recommender@rapid.com | Recommender | When assigned the R role — actively submits recommendation notes before a decision is approved |
| ✅ Bob Approver | approver@rapid.com | Approver | When assigned the A role — approves, rejects, or requests changes on documents |
| ⚙️ Pam Performer | performer@rapid.com | Performer | When assigned the P role — marks finalised documents as execution complete |
| 📝 Vera Viewer | viewer@rapid.com | Viewer | Not just a viewer — when assigned the I — Input role, actively submits input notes and expertise before a decision is approved |

> **Key insight:** The system role controls which pages a user can access. The RAPID role (R/A/P/I/D) is assigned per document and controls what actions that user can take on that specific document. A Viewer can be a crucial I — Input contributor on a decision.

---

## 14. Core Workflows

### A — Standard Approval Flow

```mermaid
sequenceDiagram
    participant CR as ✍️ Carol Creator
    participant SV as 🖥️ Server
    participant BO as ✅ Bob Approver
    participant AA as 👑 Alice Admin
    participant PP as ⚙️ Pam Performer

    CR->>SV: Create document, assign roles
    CR->>SV: Submit (server validates RAPID rules)
    SV-->>CR: ✅ Status → awaiting_agreement

    BO->>SV: Approve
    SV-->>BO: ✅ Status → approved

    AA->>SV: Finalise (atomic: update + ledger + audit)
    SV-->>AA: ✅ Status → finalized, immutable, ledger entry created

    PP->>SV: Mark execution complete
    SV-->>PP: ✅ Status → execution_complete, audit event emitted
```

### F — Recommendation and Input

1. `creator@rapid.com` → create and submit a document → assign Rick as **R**, Vera as **I**
2. `recommender@rapid.com` → open document → type notes → click **Submit Recommendation** (purple button)
3. `viewer@rapid.com` → open document → type notes → click **Submit Input** (teal button)
4. Both actions are permanently recorded in the Audit Log with actor, timestamp, and document code
5. After submission, confirmation messages replace the action buttons — contributions cannot be repeated

### B — High-Risk (Server Enforces Agree)

1. Create document with risk **High** or **Critical**
2. Try submitting without Agree role assigned → server rejects with `422`
3. Assign Agree role → submit succeeds → approve → finalise

### C — Execution Completion

1. `admin@rapid.com` → Finalise document
2. `performer@rapid.com` → **Mark Execution Complete**
3. Audit event emitted → verify in **Audit Log**

### D — Versioning

1. `admin@rapid.com` → open Finalised document → **Create New Version**
2. Same `documentCode`, incremented version — original locked permanently and cannot be re-finalised

### E — Audit Trail

1. `admin@rapid.com` → **Audit Log**
2. Every action — login, creation, submission, recommendation, input, approval, rejection, finalisation, execution completion — recorded with actor, role, timestamp, and metadata
3. The audit log is append-only — no entries can ever be deleted or modified

---

## 15. API Reference

Base URL: `http://localhost:3001` (local) · `https://rapid-ledger-production.up.railway.app` (production)

Full reference: [`docs/API.md`](docs/API.md)

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Returns JWT + user object. Rate limited — brute-force protected. |
| GET | `/auth/me` | Returns current authenticated user |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List documents (role-filtered) |
| POST | `/documents` | Create new RAPID document |
| GET | `/documents/:id` | Full document detail with role assignments, approvals, evidence |
| PATCH | `/documents/:id` | Update draft — rejected with 403 if finalised |
| POST | `/documents/:id/submit` | Submit — validates all RAPID rules server-side |
| POST | `/documents/:id/recommend` | Submit recommendation notes (R role required) |
| POST | `/documents/:id/input` | Submit input notes and expertise (I role required) |
| POST | `/documents/:id/approve` | Approve (A role required) |
| POST | `/documents/:id/reject` | Reject (A role required) |
| POST | `/documents/:id/needs-changes` | Request changes (A role required) |
| POST | `/documents/:id/finalise` | Finalise — creates immutable ledger entry |
| POST | `/documents/:id/version` | Create new version from finalised document |
| POST | `/documents/:id/execution-complete` | Mark complete (P role required) |
| GET | `/documents/:id/export-pdf` | Export finalised document as PDF (authenticated) |

### Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ledger` | All immutable finalised entries |
| GET | `/ledger/:id` | Single ledger entry |

### Audit Log

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit` | All audit events (admin/auditor only) |

### Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| POST | `/users` | Create new user |
| PATCH | `/users/:id` | Update user |
| PATCH | `/users/:id/deactivate` | Deactivate user |

---

## 16. Security Features

RAPID Ledger implements multiple layers of authentication and access security:

| Feature | Implementation |
|---------|---------------|
| **Account lockout** | 5 consecutive failed login attempts locks the account for 30 minutes — resets on successful login |
| **Failed login audit** | Every failed login attempt recorded in audit log with reason, attempt count, and lock status |
| **Inactive account blocking** | Deactivated accounts (`isActive: false`) are rejected at login with a clear error message |
| **IP rate limiting** | 10 requests per IP per 15-minute window on `/auth/login` — in-memory, stateless |
| **RBAC middleware** | Every API endpoint enforces role-based permissions at the middleware layer — not the UI |
| **JWT authentication** | Signed tokens with configurable expiry — verified on every protected request |
| **Password hashing** | bcrypt with salt rounds — plaintext passwords never stored |

> Lockout state is persisted in PostgreSQL — survives server restarts, works across instances.

---

## 17. Known Limitations

**Multi-actor E2E in CI** — The full create → approve → finalise flow requires three separate authenticated sessions — correct RBAC behaviour, not a bug. A single Playwright session cannot walk this flow because a user cannot finalise their own submission. The 12 other E2E tests pass reliably in CI. Full explanation: [`apps/web/e2e/README.md`](apps/web/e2e/README.md)

**Evidence is URL-based** — Evidence items store a URL or file reference string. Direct file upload to object storage (S3, Cloudflare R2) is not implemented. Planned future improvement.

**No email notifications** — Approvers and decision owners are not notified by email when assigned or when a document is submitted. Notification integration is a future improvement.

**Railway cold start** — The Railway API server (free tier) sleeps after inactivity. The first request may take 3–5 seconds. Always hit `/health` before demoing.

---

## 17. Future Improvements

- [ ] HttpOnly cookie auth (replace localStorage JWT for XSS hardening)
- [ ] File upload for evidence (S3 / Cloudflare R2)
- [ ] Email notifications for approvals and assignments (SendGrid / Resend)
- [x] Dashboard analytics — status distribution, risk levels, department breakdown ✅
- [x] PDF export of finalised RAPID documents ✅
- [ ] Slack / Teams integration for governance notifications
- [ ] Multi-organisation support with workspace isolation
- [ ] Two-factor authentication for admin accounts
- [x] Server-side pagination on documents and ledger ✅

---

## 📄 Documentation

| Document | Description |
|----------|-------------|
| [HLD](docs/HLD.md) | High-level system design and component diagram |
| [LLD](docs/LLD.md) | Low-level design: DB schema, API contracts, service interfaces |
| [GHERKIN](docs/GHERKIN.md) | BDD scenarios for all RAPID workflow paths |
| [API Reference](docs/API.md) | Full API endpoint documentation with request/response examples |
| [Test Plan](docs/TEST_PLAN.md) | Test strategy, coverage matrix, and test environment setup |

---

<div align="center">

*Built by **Harshini Ramasamy** — First Year CSE, NIT Warangal · Internship Project, May 2026*

*TypeScript · Next.js 16 · Elysia · Prisma 5 · PostgreSQL · npm workspaces · Vitest · Playwright · GitHub Actions · Railway · Vercel*

</div>

---

## ⚠️ Known Limitations

| Area | Current Behaviour | Production Hardening |
|------|------------------|---------------------|
| **Auth token storage** | JWT stored in `localStorage` (XSS-susceptible) | Migrate to `httpOnly`, `SameSite=Strict` cookies |
| **Token refresh** | 7-day access tokens, no silent refresh | Implement refresh token rotation via `/auth/refresh` |
| **E2E test scope** | Playwright tests target the deployed Vercel instance | Add `baseURL` override in `playwright.config.ts` for local runs |

> These are deliberate trade-offs for development velocity. They do not affect governance correctness, immutability enforcement, or audit integrity.
