# RAPID Ledger


> 🚀 **Live Demo:** https://rapid-ledger.vercel.app


> 🚀 **Live Demo:** https://rapid-ledger.vercel.app

A decision governance application that helps teams create, validate, approve, version, and audit RAPID decision documents. Finalized decisions become permanent, read-only ledger entries for accountability and compliance review.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [What is RAPID?](#2-what-is-rapid)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Summary](#4-architecture-summary)
5. [Local Setup](#5-local-setup)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [Seed Data Instructions](#8-seed-data-instructions)
9. [Test Commands](#9-test-commands)
10. [Demo User Credentials](#10-demo-user-credentials)
11. [Main User Flows](#11-main-user-flows)
12. [API Overview](#12-api-overview)
13. [Known Limitations](#13-known-limitations)
14. [Future Improvements](#14-future-improvements)

---

## 1. Project Overview

RAPID Ledger is a full-stack TypeScript application built as a May 2026 intern project. It solves a real problem in teams: important decisions are often made informally — in meetings, chats, or hallway conversations — with no clear record of who decided what, who approved it, or who is responsible for execution.

RAPID Ledger fixes this by turning every important decision into a structured RAPID document that captures:

- Who recommended the decision
- Who had to agree (approve) it
- Who provides input and context
- Who performs the work after the decision
- Who has final decision authority (exactly one person)

Once a decision is finalized by the Decide owner, it becomes a permanent, read-only ledger entry. It cannot be silently edited. Future changes require a new version, preserving the full decision history.

The application enforces governance rules at the backend level — not just in the UI — so the rules cannot be bypassed.

---

## 2. What is RAPID?

RAPID is a decision governance framework. It stands for:

| Letter | Role | Responsibility |
|--------|------|----------------|
| **R** | Recommend | Proposes the decision, frames the problem, collects evidence |
| **A** | Agree | Must approve before the decision is finalized (required for high-risk and compliance decisions) |
| **P** | Perform | Executes the decision after it is finalized |
| **I** | Input | Consulted for advice or context — does not approve or decide |
| **D** | Decide | Final decision authority — must be exactly one person |

### Why exactly one Decide owner?

If there are zero Decide owners, nobody is accountable. If there are multiple, final authority is ambiguous. RAPID forces clarity.

### When is Agree required?

Agree approvers are required when a decision is high-risk, critical, or compliance-impacting. They can approve, reject, or request changes. A document cannot be finalized while any required approval is rejected.

### What is the ledger?

Once a Decide owner finalizes a document, a permanent ledger entry is created. This entry is read-only. It cannot be edited. If the decision needs to change, the Decision Owner creates a new version — the original remains intact in the ledger.

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Elysia on Node.js adapter, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (jsonwebtoken), bcrypt |
| Validation | Zod |
| Unit + API Tests | Vitest, Supertest |
| E2E Tests | Playwright |
| Package manager | npm (monorepo with workspaces) |

---

## 4. Architecture Summary

```
Browser (Next.js — Port 3000)
        │
        │  REST API calls with JWT Bearer token
        ▼
Elysia API on Node.js (Port 3001)
        │
        │  Prisma ORM queries
        ▼
PostgreSQL Database
```

**Frontend modules:** Auth, Dashboard, Documents, Approvals, Ledger, Audit Log, Admin

**Backend modules:** Auth, Users, Documents, Roles, Evidence, Approvals, Validation, Ledger, Audit Log, Reports

**Shared package:** TypeScript DTOs, Zod schemas, status enums, role enums

For full architecture details see [docs/HLD.md](docs/HLD.md).
For schema, API contracts, and permission matrix see [docs/LLD.md](docs/LLD.md).

---

## 5. Local Setup

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- PostgreSQL running locally (or a connection string to a hosted instance)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/rapid-ledger.git
cd rapid-ledger

# 2. Install all dependencies (installs both apps + shared package)
npm install

# 3. Set up environment variables (see Section 6)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit both files with your values

# 4. Set up the database (see Section 7)
npx prisma migrate dev --name init

# 5. Seed demo data (see Section 8)
npx prisma db seed

# 6. Start the backend (Terminal 1)
cd apps/api
npm run dev
# API running at http://localhost:3001

# 7. Start the frontend (Terminal 2)
cd apps/web
npm run dev
# App running at http://localhost:3000

# 8. Open in browser
# http://localhost:3000
# Log in with any demo credential from Section 10
```

---

## 6. Environment Variables

### Backend — `apps/api/.env`

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/rapid_ledger"

# JWT signing secret — change this in production
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# JWT token expiry
JWT_EXPIRY="24h"

# Server port
PORT=3001

# Environment
NODE_ENV="development"
```

### Frontend — `apps/web/.env`

```env
# Backend API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Production environment variables

For Vercel (frontend):
```
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

For Railway (backend):
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001
NODE_ENV=production
```

---

## 7. Database Setup

This project uses PostgreSQL with Prisma ORM.

### Create the database

```bash
# Using psql
psql -U postgres
CREATE DATABASE rapid_ledger;
\q
```

### Run migrations

```bash
# From the repo root
npx prisma migrate dev --name init
```

This creates all 7 tables: `User`, `RapidDocument`, `RapidRoleAssignment`, `Evidence`, `Approval`, `LedgerEntry`, `AuditLog`.

### View the schema

```bash
# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### Reset the database

```bash
# Drop all data and re-run migrations
npx prisma migrate reset
```

---

## 8. Seed Data Instructions

The seed script creates 6 demo users and 4 sample RAPID documents covering all risk levels and statuses.

```bash
# Run the seed script
npx prisma db seed
```

### What gets seeded

**Users:**

| Name | Email | Role |
|------|-------|------|
| Alice Admin | admin@rapid.dev | admin |
| Charlie Creator | creator@rapid.dev | creator |
| Bob Recommender | recommender@rapid.dev | recommender |
| Aria Approver | approver@rapid.dev | approver |
| Dana Decider | decider@rapid.dev | decision_owner |
| Dave Performer | performer@rapid.dev | performer |

**Sample documents:**
- RAPID-001 — Draft, low-risk (no roles assigned yet)
- RAPID-002 — Awaiting agreement, high-risk, compliance-impacting
- RAPID-003 — Approved, medium-risk (ready to finalize)
- RAPID-004 — Finalized, in ledger (full history available)

### Re-seed after reset

```bash
npx prisma migrate reset
# This automatically re-runs the seed after resetting
```

---

## 9. Test Commands

### Run all backend tests (unit + API)

```bash
cd apps/api
npm test
```

Expected output: **31 tests passing** (18 unit + 13 API)

### Run unit tests only (validation engine)

```bash
cd apps/api
npm run test:unit
```

### Run API endpoint tests only

```bash
cd apps/api
npm run test:api
```

### Run frontend component tests

```bash
cd apps/web
npm test
```

### Run all tests from repo root

```bash
npm test --workspaces
```

### Test coverage summary

| Suite | File | Tests | Coverage |
|-------|------|-------|---------|
| Unit | `tests/validation.test.ts` | 18 | Validation engine — all 8 business rules |
| API | `tests/api.test.ts` | 13 | Auth, documents, approvals, ledger, exports |
| Frontend | `tests/components/` | 8 | Login form, role UI, approval buttons, finalize button |
| E2E | `tests/e2e/` | Stub | See Known Limitations |

---

## 10. Demo User Credentials

All passwords are `password123`.

| Role | Email | Can Do |
|------|-------|--------|
| Admin | admin@rapid.dev | Everything — create users, view all docs, finalize, export |
| Creator | creator@rapid.dev | Create and submit RAPID documents |
| Recommender | recommender@rapid.dev | View assigned documents, add recommendation notes |
| Approver | approver@rapid.dev | Approve, reject, or request changes on assigned documents |
| Decision Owner | decider@rapid.dev | Finalize approved documents, create new versions |
| Performer | performer@rapid.dev | Mark execution complete on finalized documents |

> There is no seeded Auditor account by default. Create one via the Admin panel: log in as admin@rapid.dev, go to Admin → Create User, and set role to Auditor.

---

## 11. Main User Flows

### Flow 1 — Create and submit a normal-risk decision

1. Log in as `creator@rapid.dev`
2. Click **+ New Document** on the dashboard
3. Fill in title, decision summary, risk level (low), department, deadline
4. On the Roles tab: assign Recommend, Perform, and Decide owners
5. Click **Submit**
6. Document moves to **Approved** (no Agree required for low-risk)
7. Log in as `decider@rapid.dev`
8. Open the document → click **Finalize**
9. Document moves to **Finalized** and appears in the Ledger

### Flow 2 — High-risk decision with approval

1. Log in as `creator@rapid.dev`
2. Create a document with risk level **High** or **Critical**
3. Assign all roles including at least one **Agree** approver
4. Submit → document moves to **Awaiting Agreement**
5. Log in as `approver@rapid.dev`
6. Go to **Approvals** → click **Approve** with notes
7. Document moves to **Approved**
8. Log in as `decider@rapid.dev` → Finalize

### Flow 3 — Compliance-impacting decision

1. Create a document with **Compliance Impact** toggled on
2. Attempt to submit without evidence → blocked with error
3. Add at least one evidence item (link, note, or file reference)
4. Submit → proceeds through approval flow

### Flow 4 — Reject and request changes

1. Approver opens a pending approval
2. Click **Request Changes** with notes
3. Document returns to **Needs Changes** status
4. Creator edits the document and resubmits
5. Approver reviews again and approves

### Flow 5 — Version a finalized decision

1. Log in as `decider@rapid.dev`
2. Open a finalized document
3. Click **Create New Version**
4. A new Draft v2 is created — original v1 remains read-only in the ledger
5. Edit, assign roles, submit, approve, and finalize v2
6. Both versions appear in the Ledger

### Flow 6 — Export a report

1. Log in as `admin@rapid.dev` or an Auditor account
2. Go to **Ledger** page
3. Click **Export CSV** or **Export Markdown**
4. File downloads with all finalized decisions

---

## 12. API Overview

Base URL: `http://localhost:3001`

All protected endpoints require: `Authorization: Bearer <token>`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login and receive JWT token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user details |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| POST | `/users` | Create a new user |
| PATCH | `/users/:id` | Update role, status, or department |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | List documents (filtered by role) |
| POST | `/documents` | Create a new RAPID document |
| GET | `/documents/:id` | Get document with roles, evidence, approvals |
| PATCH | `/documents/:id` | Update draft or needs_changes document |
| POST | `/documents/:id/submit` | Submit for validation and approval |
| POST | `/documents/:id/finalize` | Finalize (Decide owner or Admin) |
| POST | `/documents/:id/version` | Create new version from finalized document |
| POST | `/documents/:id/execution-complete` | Mark execution complete (Performer) |

### Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents/:id/roles` | Assign a RAPID role |
| DELETE | `/documents/:id/roles/:roleId` | Remove a role assignment |

### Evidence

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents/:id/evidence` | List evidence for a document |
| POST | `/documents/:id/evidence` | Attach new evidence |
| DELETE | `/documents/:id/evidence/:evidenceId` | Remove evidence item |

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/approvals/my` | Get current user's pending approvals |
| POST | `/documents/:id/approvals/:approvalId/approve` | Approve |
| POST | `/documents/:id/approvals/:approvalId/reject` | Reject |
| POST | `/documents/:id/approvals/:approvalId/request-changes` | Request changes |

### Ledger and Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ledger` | List all finalized ledger entries |
| GET | `/ledger/:id` | Get a single ledger entry |
| GET | `/audit-log` | List all audit log entries (read-only) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/ledger.csv` | Download ledger as CSV |
| GET | `/reports/ledger.md` | Download ledger as Markdown |
| GET | `/reports/pending-approvals.csv` | Pending approvals report |
| GET | `/reports/high-risk.csv` | High-risk decisions report |
| GET | `/reports/owner-workload.csv` | Owner workload report |

For full request/response payloads see [docs/LLD.md](docs/LLD.md) and [docs/API.md](docs/API.md).

---

## 13. Known Limitations

### E2E Tests (Playwright)

Playwright is installed and configured. The full E2E test suite covering the Admin → Creator → Approver → Decide owner → Ledger flow was attempted but is not stable in the current setup. The test runner causes significant slowdown on the development machine and the role assignment dropdown selector requires additional work to target correctly. The application is fully functional and covered by 31 passing unit and API tests. E2E coverage is a planned improvement.

### No real file uploads

Evidence of type `file` stores a local file path string rather than uploading an actual file. A real file upload system (e.g. using AWS S3 or Cloudflare R2) would be required for production.

### No email notifications

When a document is submitted for approval, or when an approver requests changes, no email is sent. Notifications would need a mail service integration (e.g. Resend or SendGrid).

### No PDF export

The PRD lists PDF export as an optional bonus. It is not implemented in the MVP. CSV and Markdown exports are fully functional.

### No real-time updates

If two users are looking at the same document, changes made by one user are not pushed to the other. A page refresh is required to see updated state. Real-time support would require WebSockets or Server-Sent Events.

### Single-tenant only

This application has no multi-tenancy. All users share one database and can see all documents (subject to role restrictions). Tenant isolation would require schema-level or row-level separation.

### SQLite removed — PostgreSQL required

The project started with SQLite but migrated to PostgreSQL for production compatibility with Railway deployment. A local PostgreSQL instance is required to run the project.

---

## 14. Future Improvements

### Notifications
- Email notifications via Resend or SendGrid when approvals are requested or decisions are finalized
- In-app notification bell with unread count

### Integrations
- Slack integration — post to a channel when a document is submitted or finalized
- Google Drive evidence picker — attach Drive files directly as evidence
- Jira integration — link RAPID decisions to Jira tickets

### Auth and Security
- Enterprise SSO (SAML / OIDC)
- Multi-factor authentication
- Session management and token refresh

### Reports and Analytics
- PDF export for ledger and compliance reports
- Department-level dashboards
- Approval SLA tracking — flag decisions that have been waiting too long
- Trend analysis — decision volume over time by department and risk level

### Document Features
- Rich text editing for decision summary and context fields
- Comment threads on documents (not just approval notes)
- Full-text search across document content
- Decision templates for common decision types
- Policy and control linking

### Process and Governance
- Escalation rules when approvals are overdue
- Approval delegation when an approver is unavailable
- External auditor access mode (read-only with time-limited link)
- Compliance framework tagging (SOC 2, ISO 27001, GDPR)

### Testing
- Fix and stabilize Playwright E2E test suite
- Increase unit test coverage to include status transition validation
- Add React Testing Library snapshot tests for key UI components
- Load testing for report generation endpoints
