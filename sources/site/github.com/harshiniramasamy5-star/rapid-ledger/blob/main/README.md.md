# Source: https://github.com/harshiniramasamy5-star/rapid-ledger/blob/main/README.md

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[rapid-ledger](https://github.com/harshiniramasamy5-star/rapid-ledger)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Frapid-ledger)
 

 

## FilesExpand file tree

 main

/

# README.md

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

![author](https://github.githubassets.com/images/gravatars/gravatar-user-420.png?size=40)

Harshini

[fix: point db:seed at apps/api/src/seed.ts, remove stale prisma/seed.…](https://github.com/harshiniramasamy5-star/rapid-ledger/commit/6b455325a1efc4b5e7e3f8f86697271e4b66b51d)

Open commit detailsfailure

Jun 18, 2026

[6b45532](https://github.com/harshiniramasamy5-star/rapid-ledger/commit/6b455325a1efc4b5e7e3f8f86697271e4b66b51d) · Jun 18, 2026

## History

[History](https://github.com/harshiniramasamy5-star/rapid-ledger/commits/main/README.md)

Open commit details

History

758 lines (610 loc) · 25.8 KB

## FilesExpand file tree

 main

/

# README.md

Copy path

Top

## File metadata and controls

- Preview
 
- Code
 
- Blame
 

758 lines (610 loc) · 25.8 KB

[Raw](https://github.com/harshiniramasamy5-star/rapid-ledger/raw/refs/heads/main/README.md)

Copy raw file

Download raw file

Outline

Edit and raw actions

[![CI](https://github.com/harshiniramasamy5-star/rapid-ledger/actions/workflows/ci.yml/badge.svg)](https://github.com/harshiniramasamy5-star/rapid-ledger/actions/workflows/ci.yml/badge.svg) [![TypeScript](https://camo.githubusercontent.com/0d4dcf49d25337c769909d6d8d5b1ac02a3f75d48452c5fd27bf20228e4deb7f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f547970655363726970742d7374726963742532302545322539432539332d3331373843363f6c6f676f3d74797065736372697074266c6f676f436f6c6f723d7768697465)](https://camo.githubusercontent.com/0d4dcf49d25337c769909d6d8d5b1ac02a3f75d48452c5fd27bf20228e4deb7f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f547970655363726970742d7374726963742532302545322539432539332d3331373843363f6c6f676f3d74797065736372697074266c6f676f436f6c6f723d7768697465) [![Tests](https://camo.githubusercontent.com/bdf46c076703984da364f70cb683b00eb81cfc43dd4ea9c1b047f51dcddaf9ae/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f74657374732d31313825323070617373696e672d627269676874677265656e3f6c6f676f3d766974657374)](https://camo.githubusercontent.com/bdf46c076703984da364f70cb683b00eb81cfc43dd4ea9c1b047f51dcddaf9ae/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f74657374732d31313825323070617373696e672d627269676874677265656e3f6c6f676f3d766974657374) [![Railway](https://camo.githubusercontent.com/87439ce776d9b1aeb78404332be5cdf7cb49f77614cbebf3c77562fed62c8c42/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f5261696c7761792d6465706c6f7965642d3742324642453f6c6f676f3d7261696c776179266c6f676f436f6c6f723d7768697465)](https://camo.githubusercontent.com/87439ce776d9b1aeb78404332be5cdf7cb49f77614cbebf3c77562fed62c8c42/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f5261696c7761792d6465706c6f7965642d3742324642453f6c6f676f3d7261696c776179266c6f676f436f6c6f723d7768697465) [![Vercel](https://camo.githubusercontent.com/5f783251568da62360ddbf6fdf78b34782b7f3ce9009a644e50edfde62943a3d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f56657263656c2d6c6976652d3030303030303f6c6f676f3d76657263656c266c6f676f436f6c6f723d7768697465)](https://camo.githubusercontent.com/5f783251568da62360ddbf6fdf78b34782b7f3ce9009a644e50edfde62943a3d/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f56657263656c2d6c6976652d3030303030303f6c6f676f3d76657263656c266c6f676f436f6c6f723d7768697465) [![Prisma](https://camo.githubusercontent.com/a534f24a75278537dd24c400ecd18da78356f5455fa56bdc4173676c5185ef7a/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f507269736d612d4f524d2d3244333734383f6c6f676f3d707269736d61266c6f676f436f6c6f723d7768697465)](https://camo.githubusercontent.com/a534f24a75278537dd24c400ecd18da78356f5455fa56bdc4173676c5185ef7a/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f507269736d612d4f524d2d3244333734383f6c6f676f3d707269736d61266c6f676f436f6c6f723d7768697465) [![License](https://camo.githubusercontent.com/3dbbde5f79a33abd50d80ee2476ee9236804a30aea2f11009a427a50ac6ef76c/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c6963656e73652d4d49542d323263353565)](https://camo.githubusercontent.com/3dbbde5f79a33abd50d80ee2476ee9236804a30aea2f11009a427a50ac6ef76c/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c6963656e73652d4d49542d323263353565)

 

# ⚖️ RAPID Ledger

### _Decision governance without compromise._

A full-stack decision governance platform implementing the **RAPID framework** — structured accountability for high-stakes decisions with immutable audit trails, role-based access control, and compliance-grade record keeping.

**[Live Demo](https://rapid-ledger.vercel.app)** · **[API Health](https://rapid-ledger-production.up.railway.app/health)** · **[Repository](https://github.com/harshiniramasamy5-star/rapid-ledger)**

---

> ⚠️ **Demo Pre-flight**: Wake the Railway container before your demo:
> 
> ```shell
> curl https://rapid-ledger-production.up.railway.app/health
> # Wait for {"status":"ok"} — free tier cold-starts take ~25 seconds
> ```

---

## Table of Contents

1. [What is RAPID Ledger?](https://github.com/#1-what-is-rapid-ledger)
2. [The RAPID Framework](https://github.com/#2-the-rapid-framework)
3. [Architecture](https://github.com/#3-architecture)
4. [Tech Stack](https://github.com/#4-tech-stack)
5. [Features](https://github.com/#5-features)
6. [Decision Workflow](https://github.com/#6-decision-workflow)
7. [Role-Based Access Control](https://github.com/#7-role-based-access-control)
8. [Database Schema](https://github.com/#8-database-schema)
9. [API Reference](https://github.com/#9-api-reference)
10. [Setup & Installation](https://github.com/#10-setup--installation)
11. [Running Tests](https://github.com/#11-running-tests)
12. [Project Structure](https://github.com/#12-project-structure)
13. [Deployment](https://github.com/#13-deployment)
14. [Demo Credentials](https://github.com/#14-demo-credentials)
15. [Known Limitations](https://github.com/#15-known-limitations)
16. [Author](https://github.com/#16-author)

---

## 1\. What is RAPID Ledger?

RAPID Ledger is a **decision governance platform** built for organisations that need structured, auditable, and immutable records of high-stakes decisions. It enforces the **RAPID decision-making framework**, ensuring every decision has clear ownership, documented reasoning, appropriate review, and a permanent compliance record.

### Why RAPID Ledger?

| Problem | RAPID Ledger Solution |
| --- | --- |
| Decisions made in Slack — no audit trail | Every action is immutably logged with actor, timestamp, and context |
| No clear ownership of decisions | Exactly one `Decide` owner enforced per document |
| Approvals forgotten or bypassed | Workflow engine enforces state machine transitions |
| Compliance reviews are manual | Ledger entries auto-generated at finalization |
| High-risk decisions lack scrutiny | `Agree` role + evidence mandatory for `high`/`critical` risk |

---

## 2\. The RAPID Framework

RAPID is a decision-rights framework that assigns five distinct roles to every decision:

```
R — Recommend   Input the recommendation and supporting rationale
A — Agree       Must formally agree before a decision is enacted (high-risk only)
P — Perform     Executes the decision once finalized
I — Input       Provides contextual information (viewer role)
D — Decide      Single owner — makes the final call
```

Loading

**Unable to render rich display**

Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range. 
 
For more information, see https://docs.github.com/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams#creating-mermaid-diagrams 

graph LR
 R(\[🔵 Recommend\\nCreator / Recommender\]) --> D
 A(\[🟡 Agree\\nApprover\]) --> D
 I(\[⚪ Input\\nViewer\]) --> R
 D(\[🔴 Decide\\nAdmin\]) --> P
 P(\[🟢 Perform\\nPerformer\])

 style R fill:#3b82f6,color:#fff,stroke:none
 style A fill:#f59e0b,color:#fff,stroke:none
 style I fill:#6b7280,color:#fff,stroke:none
 style D fill:#ef4444,color:#fff,stroke:none
 style P fill:#22c55e,color:#fff,stroke:none

Every document on RAPID Ledger must have:

- ✅ Exactly **one** `Decide` owner (Admin)
- ✅ At least **one** `Recommend` role
- ✅ At least **one** `Perform` role
- ✅ An `Agree` role **if** risk level is `high` or `critical`
- ✅ Compliance evidence **if** `complianceImpact` is true

---

## 3\. Architecture

Loading

**Unable to render rich display**

Could not find a suitable point for the given distance 
 
For more information, see https://docs.github.com/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams#creating-mermaid-diagrams 

graph TB
 subgraph Client\["Client Layer"\]
 NEXT\["Next.js 15\\nApp Router\\nTailwind CSS"\]
 end

 subgraph API\["API Layer"\]
 ELYSIA\["Elysia\\nBun Runtime\\nTypeScript"\]
 AUTH\["JWT Auth\\nMiddleware"\]
 RBAC\["RBAC\\nrequirePermission()"\]
 VAL\["Zod\\nValidation"\]
 end

 subgraph Services\["Service Layer"\]
 DOCSVC\["Document\\nService"\]
 AUDSVC\["Audit\\nService"\]
 LEDSVC\["Ledger\\nService"\]
 USRSVC\["User\\nService"\]
 end

 subgraph Data\["Data Layer"\]
 PRISMA\["Prisma ORM\\nType-safe queries"\]
 PG\[("PostgreSQL\\nRailway")\]
 end

 subgraph Shared\["Shared Package"\]
 TYPES\["DTOs\\nEnums\\nLabels"\]
 end

 NEXT -->|REST API| ELYSIA
 ELYSIA --> AUTH --> RBAC
 RBAC --> VAL --> DOCSVC
 RBAC --> AUDSVC
 RBAC --> LEDSVC
 RBAC --> USRSVC
 DOCSVC --> PRISMA
 AUDSVC --> PRISMA
 LEDSVC --> PRISMA
 USRSVC --> PRISMA
 PRISMA --> PG
 TYPES -.->|imported by| NEXT
 TYPES -.->|imported by| ELYSIA

 style Client fill:#0f172a,color:#fff,stroke:#334155
 style API fill:#1e293b,color:#fff,stroke:#334155
 style Services fill:#172554,color:#fff,stroke:#334155
 style Data fill:#14532d,color:#fff,stroke:#334155
 style Shared fill:#3b0764,color:#fff,stroke:#334155

### Monorepo Structure

```
rapid-ledger/
├── apps/
│   ├── api/                   # Elysia backend (Railway)
│   │   └── src/
│   │       ├── routes/        # Thin route handlers
│   │       ├── services/      # Business logic layer
│   │       ├── lib/           # Auth, RBAC, Prisma, errors
│   │       └── tests/         # Vitest integration tests
│   └── web/                   # Next.js frontend (Vercel)
│       └── app/               # App Router pages
├── packages/
│   └── shared/                # Shared DTOs, enums, labels
│       └── src/types/models.ts
├── prisma/
│   ├── schema.prisma          # Single source of truth
│   ├── migrations/            # 11 versioned migrations
│   └── schema.prisma          # Prisma schema
└── docs/                      # PRD, HLD, LLD, GHERKIN
```

---

## 4\. Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | Next.js 15, App Router | Server/client rendering |
| **Styling** | Tailwind CSS, shadcn/ui | Component library |
| **Backend** | Elysia (Bun) | High-performance API framework |
| **Language** | TypeScript (strict) | End-to-end type safety |
| **ORM** | Prisma 5 | Type-safe DB access |
| **Database** | PostgreSQL (Railway) | Production database |
| **Auth** | JWT (RS256-style HS256) | Stateless authentication |
| **Validation** | Zod | Runtime schema validation |
| **Testing** | Vitest + Playwright + Jest | Unit, E2E, component tests |
| **CI/CD** | GitHub Actions | Automated test + lint pipeline |
| **Deploy** | Railway + Vercel | Backend + frontend hosting |
| **Shared** | npm workspaces | Monorepo package management |

---

## 5\. Features

### 🔐 Authentication & Security

- JWT-based stateless authentication
- Bcrypt password hashing (10 rounds)
- Account lockout after failed login attempts
- Refresh token architecture
- Per-route permission enforcement via `requirePermission()`

### 📄 Document Governance

- Create structured decision documents with mandatory fields
- Risk levels: `low` · `medium` · `high` · `critical`
- Compliance impact flagging with evidence requirements
- Mandatory `decisionSummary`, `businessContext`, `problemStatement`, `proposedDecision`
- Document versioning — create new versions of finalized decisions
- Immutable finalization — finalized documents cannot be edited or deleted

### 🔄 Approval Workflow

- State machine enforced at the service layer
- Full workflow: `draft → submitted → approved → finalized → execution_complete`
- Rejection and needs-changes cycles supported
- High-risk path: `draft → submitted → awaiting_agreement → approved → finalized`

### 📋 RAPID Role Assignment

- Per-document role assignment (not just system roles)
- Validation ensures all required RAPID roles are present before submission
- `Agree` role mandatory for `high`/`critical` risk documents
- Evidence required for compliance-impact documents

### 🔒 Immutable Ledger

- Ledger entry auto-created at finalization via atomic Prisma transaction
- Ledger includes: documentCode, version, title, finalizedBy, finalizedAt
- CSV export of ledger entries
- Status `finalized` and `execution_complete` documents cannot be deleted

### 📊 Audit Trail

- Every significant action generates an audit log entry
- 15+ audit action types across the entire lifecycle
- Audit logs filterable by actor, action, entity type, entity ID
- Enforced at the service layer across all workflows

### 🔍 Search & Filters

- Full-text search across title and documentCode
- Filter by status, department, riskLevel
- Paginated results with configurable page size

### 📤 Exports

- `/ledger/export.csv` — download ledger as CSV
- `/documents/:id/export-pdf` — export decision document as PDF

### 📈 Dashboard

- At-a-glance stats: total documents, pending approvals, finalized count
- Role-aware views — each role sees only what's relevant

---

## 6\. Decision Workflow

Loading

**Unable to render rich display**

Could not find a suitable point for the given distance 
 
For more information, see https://docs.github.com/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams#creating-mermaid-diagrams 

stateDiagram-v2
 \[\*\] --> draft : Creator creates document

 draft --> submitted : Creator submits
 submitted --> awaiting\_agreement : High risk — Agree required
 submitted --> approved : Standard risk — Admin approves
 awaiting\_agreement --> approved : Approver agrees + Admin approves
 submitted --> rejected : Admin rejects
 submitted --> needs\_changes : Admin requests changes
 awaiting\_agreement --> needs\_changes : Approver requests changes
 needs\_changes --> submitted : Creator resubmits
 approved --> finalized : Admin finalizes\\n(Ledger entry created)
 finalized --> execution\_complete : Performer marks complete
 finalized --> draft : Admin creates new version

 rejected --> \[\*\]
 execution\_complete --> \[\*\]

### Workflow Rules

- Only the document **creator** can submit
- Only **Admin** (Decide role) can approve, reject, finalize
- **Approver** must agree before Admin can approve (high/critical risk)
- **Performer** marks execution complete after finalization
- Finalization is **atomic** — status update + ledger entry + audit log in a single transaction
- Once `finalized`, a document is **immutable** — PATCH/DELETE returns 403

---

## 7\. Role-Based Access Control

Loading

graph TD
 subgraph Roles
 ADMIN\["👑 Admin\\nDecider — full access"\]
 CREATOR\["✍️ Creator\\nDocument author"\]
 RECOMMENDER\["💡 Recommender\\nProvides recommendation"\]
 APPROVER\["✅ Approver\\nFormal agreement"\]
 PERFORMER\["⚙️ Performer\\nExecutes decision"\]
 VIEWER\["👁️ Viewer\\nInput provider"\]
 end

| Permission | Admin | Creator | Recommender | Approver | Performer | Viewer |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `document:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `document:create` | ✅ | ✅ | | | | |
| `document:update` | ✅ | ✅ | | | | |
| `document:submit` | ✅ | ✅ | | | | |
| `document:recommend` | ✅ | | ✅ | | | |
| `document:approve` | ✅ | | | ✅ | | |
| `document:reject` | ✅ | | | ✅ | | |
| `document:finalize` | ✅ | | | | ✅ | |
| `document:version` | ✅ | ✅ | | | | |
| `document:input` | ✅ | | | | | ✅ |
| `role:assign` | ✅ | ✅ | | | | |
| `evidence:add` | ✅ | ✅ | ✅ | | | |
| `user:create` | ✅ | | | | | |
| `user:read` | ✅ | ✅ | | | | |
| `ledger:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit:read` | ✅ | ✅ | | ✅ | | |
| `report:read` | ✅ | | | | | |

RBAC is enforced at **two layers**:

1. **API layer** — `requirePermission()` middleware on every route handler
2. **Frontend layer** — conditional rendering based on `user.role`

---

## 8\. Database Schema

Loading

**Unable to render rich display**

Could not find a suitable point for the given distance 
 
For more information, see https://docs.github.com/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams#creating-mermaid-diagrams 

erDiagram
 User {
 string id PK
 string email UK
 string name
 string password
 UserRole role
 string department
 boolean isActive
 int failedLogins
 datetime lockedUntil
 }

 RapidDocument {
 string id PK
 string documentCode
 int version
 string title
 string decisionSummary
 RiskLevel riskLevel
 DocumentStatus status
 boolean complianceImpact
 string createdById FK
 datetime finalizedAt
 }

 RoleAssignment {
 string id PK
 string documentId FK
 string userId FK
 RoleType roleType
 }

 AuditLog {
 string id PK
 string userId FK
 AuditAction action
 string entityType
 string entityId
 string documentId FK
 string details
 }

 LedgerEntry {
 string id PK
 string documentId FK
 string documentCode
 int version
 string title
 string finalizedBy
 datetime finalizedAt
 }

 Evidence {
 string id PK
 string documentId FK
 string type
 string title
 string urlOrPath
 string uploadedBy FK
 }

 Approval {
 string id PK
 string documentId FK
 string approverId FK
 string decision
 string comment
 }

 User ||--o{ RapidDocument : "creates"
 User ||--o{ RoleAssignment : "assigned"
 User ||--o{ AuditLog : "generates"
 User ||--o{ Evidence : "uploads"
 User ||--o{ Approval : "makes"
 RapidDocument ||--o{ RoleAssignment : "has"
 RapidDocument ||--o{ AuditLog : "tracked by"
 RapidDocument ||--o{ LedgerEntry : "generates"
 RapidDocument ||--o{ Evidence : "has"
 RapidDocument ||--o{ Approval : "has"

### Enum Types

| Enum | Values |
| --- | --- |
| `UserRole` | `admin` · `creator` · `recommender` · `approver` · `performer` · `viewer` |
| `DocumentStatus` | `draft` · `submitted` · `awaiting_agreement` · `approved` · `rejected` · `needs_changes` · `finalized` · `execution_complete` |
| `RiskLevel` | `low` · `medium` · `high` · `critical` |
| `RoleType` | `recommend` · `agree` · `perform` · `input` · `decide` |
| `AuditAction` | `login` · `document_created` · `document_submitted` · `document_approved` · `document_rejected` · `document_finalized` · `document_versioned` · `role_assigned` · `evidence_added` · `execution_complete` · `login_failed` + more |

---

## 9\. API Reference

### Authentication

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Login, returns JWT | ❌ |
| `POST` | `/api/auth/refresh` | Refresh JWT | ❌ |
| `GET` | `/api/auth/me` | Current user profile | ✅ |

### Documents

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/documents` | List documents (search, filter, paginate) | ✅ |
| `POST` | `/api/documents` | Create new document | ✅ |
| `GET` | `/api/documents/:id` | Get document by ID | ✅ |
| `PATCH` | `/api/documents/:id` | Update draft document | ✅ |
| `DELETE` | `/api/documents/:id` | Delete draft (admin only) | ✅ |
| `POST` | `/api/documents/:id/submit` | Submit for review | ✅ |
| `POST` | `/api/documents/:id/recommend` | Provide recommendation | ✅ |
| `POST` | `/api/documents/:id/approve` | Approve document | ✅ |
| `POST` | `/api/documents/:id/reject` | Reject document | ✅ |
| `POST` | `/api/documents/:id/finalize` | Finalize (creates ledger entry) | ✅ |
| `POST` | `/api/documents/:id/complete` | Mark execution complete | ✅ |
| `POST` | `/api/documents/:id/version` | Create new version | ✅ |
| `POST` | `/api/documents/:id/roles` | Assign RAPID role | ✅ |
| `POST` | `/api/documents/:id/evidence` | Add evidence | ✅ |
| `GET` | `/api/documents/:id/export-pdf` | Export as PDF | ✅ |

### Ledger, Audit & Users

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/ledger` | List ledger entries | ✅ |
| `GET` | `/api/ledger/export.csv` | Download ledger as CSV | ✅ |
| `GET` | `/api/audit-logs` | List audit logs (filterable) | ✅ |
| `GET` | `/api/users` | List all users | ✅ |
| `POST` | `/api/users` | Create user (admin only) | ✅ |
| `GET` | `/api/health` | Health check | ❌ |

### Query Parameters — `GET /api/documents`

```
?search=deployment     Full-text search on title and documentCode
?status=draft          Filter by document status
?riskLevel=high        Filter by risk level
?department=Engineering Filter by department
?page=1&limit=20       Pagination
```

---

## 10\. Setup & Installation

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm 10+

### 1\. Clone the repository

```shell
git clone https://github.com/harshiniramasamy5-star/rapid-ledger.git
cd rapid-ledger
```

### 2\. Install dependencies

```shell
npm install
```

### 3\. Configure environment variables

**`apps/api/.env`**

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/rapid_ledger"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key"
PORT=3001
NODE_ENV="development"
```

**`apps/web/.env.local`**

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 4\. Set up the database

```shell
# Run migrations
npx prisma migrate deploy --schema=prisma/schema.prisma

# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Seed demo data
npm run db:seed   # from repo root
```

### 5\. Run the application

```shell
# Terminal 1 — API
cd apps/api && npm run dev

# Terminal 2 — Frontend
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 11\. Running Tests

### All tests in one command

```shell
# API tests (Vitest)
cd apps/api && npx vitest run --reporter=verbose

# Frontend tests (Jest + React Testing Library)
cd apps/web && npx jest --passWithNoTests

# E2E tests (Playwright)
cd apps/web && npx playwright test --reporter=line

# TypeScript — both apps
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit

# Lint
cd apps/api && npx eslint
```

### Test results

| Suite | Framework | Count | Coverage |
| --- | --- | --- | --- |
| API integration tests | Vitest | 80 ✅ | Auth, CRUD, RBAC, workflow, immutability |
| RBAC permission tests | Vitest | 44 ✅ | All role × permission combinations |
| Frontend component tests | Jest + RTL | 9 ✅ | LoginPage — render, validation, routing, toasts |
| E2E workflow tests | Playwright | 12 ✅ | Login, navigation, RBAC gates, adversarial |
| **Total** | | **101 ✅** | |

### CI Pipeline

Loading

graph LR
 PUSH\["git push\\nmain"\] --> CI\["GitHub Actions\\nCI #ci.yml"\]
 CI --> MIGRATE\["prisma migrate\\ndeploy"\]
 MIGRATE --> SEED\["prisma db\\nseed"\]
 SEED --> VITEST\["Vitest\\n80 tests"\]
 SEED --> JEST\["Jest\\n9 tests"\]
 VITEST --> TSC\["tsc --noEmit\\nboth apps"\]
 JEST --> TSC
 TSC --> LINT\["ESLint\\n0 errors"\]
 LINT --> E2E\["Playwright\\n12 E2E tests"\]
 E2E --> DONE\["✅ Green"\]

 style DONE fill:#22c55e,color:#fff,stroke:none
 style PUSH fill:#1e293b,color:#fff,stroke:none

---

## 12\. Project Structure

```
apps/
├── api/
│   └── src/
│       ├── routes/
│       │   ├── auth.routes.ts         # Login, refresh, me
│       │   ├── document.routes.ts     # Full document lifecycle
│       │   ├── ledger.routes.ts       # Ledger + CSV export
│       │   ├── audit.routes.ts        # Audit log queries
│       │   └── user.routes.ts         # User management
│       ├── services/
│       │   ├── document.service.ts    # Document business logic
│       │   ├── audit.service.ts       # Audit log writes
│       │   ├── ledger.service.ts      # Ledger + CSV generation
│       │   └── user.service.ts        # User CRUD
│       ├── lib/
│       │   ├── permissions.ts         # RBAC permission map
│       │   ├── validation.ts          # RAPID governance rules
│       │   ├── prisma.ts              # Prisma singleton
│       │   └── errors.ts              # Typed error responses
│       └── tests/
│           ├── immutability.test.ts   # Finalized doc cannot be mutated
│           └── rbac.permissions.test.ts # 44 RBAC assertions
│   └── tests/
│       ├── api.test.ts                # Full API integration suite
│       └── validation.test.ts         # RAPID governance validation
└── web/
    └── app/
        ├── login/                     # Auth page + tests
        ├── dashboard/                 # Stats overview
        ├── documents/                 # Document list + detail
        ├── documents/new/             # Create document
        ├── approvals/                 # Approver queue
        ├── ledger/                    # Immutable ledger view
        ├── audit-log/                 # Audit trail viewer
        └── admin/                     # User management (admin only)

packages/
└── shared/
    └── src/types/models.ts            # Shared DTOs, enums, labels

prisma/
├── schema.prisma                      # Single source of truth
├── migrations/                        # 11 versioned migrations
└── (seed lives at apps/api/src/seed.ts)

docs/
├── PRD.md                             # Product Requirements
├── HLD.md                             # High-Level Design
├── LLD.md                             # Low-Level Design
└── GHERKIN.md                         # BDD acceptance criteria
```

---

## 13\. Deployment

### Backend — Railway

Loading

graph LR
 GH\["GitHub\\nmain branch"\] -->|push| RW\["Railway\\nNixpacks build"\]
 RW --> INST\["npm install"\]
 INST --> GEN\["prisma generate"\]
 GEN --> TSC\["tsc --noEmit\\n✅ enforced"\]
 TSC --> MIG\["prisma migrate\\ndeploy"\]
 MIG --> START\["npx tsx\\nsrc/index.ts"\]
 START --> HC\["Healthcheck\\n/health ✅"\]

 style HC fill:#22c55e,color:#fff,stroke:none

**`railway.json`** — TypeScript compilation enforced in every production build:

```json
{
  "build": {
    "buildCommand": "npm install && prisma generate && cd apps/api && npx tsc --noEmit"
  },
  "deploy": {
    "startCommand": "cd apps/api && prisma migrate deploy && npx tsx src/index.ts",
    "healthcheckPath": "/health"
  }
}
```

### Frontend — Vercel

- Auto-deploys on push to `main`
- `NEXT_PUBLIC_API_URL` set to Railway production URL
- Static routes pre-rendered at build time, dynamic routes server-rendered on demand

---

## 14\. Demo Credentials

All accounts use password: **`password123`**

| Email | Role | Access |
| --- | --- | --- |
| `admin@rapid.com` | **Admin (Decider)** | Full access — approve, reject, finalize, manage users, view everything |
| `creator@rapid.com` | **Creator** | Create and submit documents, assign roles, add evidence |
| `recommender@rapid.com` | **Recommender** | Provide formal recommendations on submitted documents |
| `approver@rapid.com` | **Approver** | Formally agree on high-risk documents before Admin decision |
| `performer@rapid.com` | **Performer** | Mark finalized decisions as execution complete |
| `viewer@rapid.com` | **Viewer** | Read-only access + provide input context |

### Demo Workflow (end-to-end)

```
1. Login as creator@rapid.com
2. Create a new document (risk: high, complianceImpact: true)
3. Assign roles — recommender, approver, performer, admin as decide
4. Add evidence (link or meeting note)
5. Submit the document

6. Login as recommender@rapid.com → Recommend

7. Login as approver@rapid.com → Agree (high risk)

8. Login as admin@rapid.com → Approve → Finalize
   (Ledger entry created automatically)

9. Login as performer@rapid.com → Mark execution complete

10. Login as admin@rapid.com → View ledger + audit log
    → Create new version of finalized document
```

---

## 15\. Known Limitations

These are deliberate architectural trade-offs made for development velocity, documented here for full transparency:

- **JWT Storage**: Tokens are stored in `localStorage` for development simplicity. Production hardening would use `httpOnly SameSite=Strict` cookies to prevent XSS token theft.
 
- **Rate Limiter**: The in-memory rate limiter resets on server restart. On Railway free tier, cold starts reset brute-force protection. A Redis-backed limiter (e.g. `rate-limiter-flexible`) would be required for production.
 
- **Audit Log Enforcement**: Audit logs are enforced at the service layer. Direct Prisma writes that bypass the service layer would not generate audit records. DB-level triggers would be required for absolute production hardening.
 
- **Document Ownership (canEdit)**: Edit access requires both owning the document AND the document being in `draft` or `needs_changes` status. Cross-creator edit attempts return `403` at the API level.
 
- **Evidence Storage**: Evidence is stored as URLs/paths, not binary blobs. A production system would use S3 or equivalent object storage with checksummed uploads for tamper-proof evidence.
 
- **Railway Free Tier**: Cold starts on Railway free tier take ~25 seconds. A paid tier or a self-hosted PostgreSQL + Node deployment would eliminate this.
 
- **Single Database**: No read replica or connection pooling (PgBouncer). Appropriate for current scale; required for 50+ concurrent engineers.
 

---

## 16\. Author

**Harshini Ramasamy** — NIT Warangal, CSE

Built as a first-year internship project demonstrating:

- Full-stack TypeScript development
- Domain-driven architecture (decision governance)
- Compliance-grade engineering (immutable records, audit trails)
- Production deployment (Railway + Vercel + GitHub Actions CI)
- Comprehensive test coverage (101 tests across 3 frameworks)

---

**RAPID Ledger** — _Because governance deserves better than a Slack thread._

[![CI](https://github.com/harshiniramasamy5-star/rapid-ledger/actions/workflows/ci.yml/badge.svg)](https://github.com/harshiniramasamy5-star/rapid-ledger/actions)