# High-Level Design — RAPID Ledger

## 1. System Overview

RAPID Ledger is a decision governance application that helps teams create, validate, approve, version, and maintain RAPID decision documents. Finalized documents become read-only ledger entries for audit and compliance purposes.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│              Next.js Web App (Port 3000)                │
│   Auth · Dashboard · Documents · Ledger · Audit · Admin │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP REST API (JWT Bearer Token)
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Elysia API on Node.js (Port 3001)          │
│   Auth · Users · Documents · Roles · Evidence ·         │
│   Approvals · Validation · Ledger · Audit · Reports     │
└─────────────────────┬───────────────────────────────────┘
                      │ Prisma ORM
                      ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                        │
│   Users · RapidDocuments · RoleAssignments · Evidence   │
│   Approvals · LedgerEntries · AuditLogs                 │
└─────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Elysia on Node.js adapter, TypeScript
- Database: PostgreSQL with Prisma ORM
- Auth: JWT (jsonwebtoken), bcrypt password hashing
- Testing: Vitest (unit + API), Playwright (E2E)
- Package manager: npm (monorepo with workspaces)

---

## 3. Repository Structure

```
rapid-ledger/
├── apps/
│   ├── web/                   # Next.js frontend
│   │   ├── app/               # App router pages
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── documents/
│   │   │   ├── approvals/
│   │   │   ├── ledger/
│   │   │   ├── audit-log/
│   │   │   └── admin/
│   │   └── components/ui/     # shadcn/ui components
│   └── api/                   # Elysia backend
│       ├── src/
│       │   ├── routes/        # Route handlers
│       │   ├── services/      # Business logic
│       │   ├── validators/    # Zod schemas
│       │   └── middleware/    # Auth middleware
│       └── tests/             # Vitest test suites
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docs/
│   ├── PRD.md
│   ├── HLD.md
│   ├── LLD.md
│   ├── GHERKIN.md
│   ├── API.md
│   └── TEST_PLAN.md
└── README.md
```

---

## 4. Frontend Module Breakdown

| Module | Pages | Responsibility |
|--------|-------|----------------|
| Auth | `/login` | Login form, JWT storage, redirect on success |
| Dashboard | `/dashboard` | Stat cards, document table, search, filters |
| Documents | `/documents/new`, `/documents/[id]` | 3-step creation wizard, detail view, role assignment, evidence, actions |
| Approvals | `/approvals` | Pending approval queue, approve/reject/request-changes |
| Ledger | `/ledger` | Read-only finalized entries, search, filter, export |
| Audit Log | `/audit-log` | Chronological action history, filter by actor/action |
| Admin | `/admin` | User management, create/activate/deactivate |
| Middleware | `middleware.ts` | Route protection by role, redirect to login if unauthenticated |

---

## 5. Backend Module Breakdown

| Module | Routes | Responsibility |
|--------|--------|----------------|
| Auth | `/auth/login`, `/auth/logout`, `/auth/me` | JWT issue, validate, blacklist |
| Users | `/users` | CRUD, role assignment, activation toggle |
| Documents | `/documents`, `/documents/:id` | Create, read, update, submit, finalize, version, execution-complete |
| Roles | `/documents/:id/roles` | Assign and remove RAPID role assignments |
| Evidence | `/documents/:id/evidence` | Attach, list, delete evidence items |
| Approvals | `/approvals/my`, `/documents/:id/approvals/:aid/*` | Fetch pending, approve, reject, request-changes |
| Validation | Internal service | Business rule enforcement before submit/finalize |
| Ledger | `/ledger`, `/ledger/:id` | Read-only finalized records |
| Audit Log | `/audit-log` | Read-only action history |
| Reports | `/reports/*` | CSV and Markdown export endpoints |

---

## 6. Database Overview

Seven core tables:

| Table | Purpose |
|-------|---------|
| `User` | Application users with roles and active status |
| `RapidDocument` | The working decision record with full lifecycle |
| `RapidRoleAssignment` | Maps users to RAPID roles per document |
| `Evidence` | Supporting files, links, notes per document |
| `Approval` | Agree approver decisions per document |
| `LedgerEntry` | Immutable finalized decision record |
| `AuditLog` | Append-only action history |

---

## 7. Authentication Flow

```
User submits login form
        │
        ▼
POST /auth/login
        │
        ▼
Lookup user by email
        │
   User not found ──► 401 Unauthorized
        │
        ▼
bcrypt.compare(password, passwordHash)
        │
   No match ──► 401 Unauthorized
        │
        ▼
User inactive ──► 403 Forbidden
        │
        ▼
jwt.sign({ userId, role }) → token (24hr expiry)
        │
        ▼
Return { token, user } to frontend
        │
        ▼
Frontend stores token in localStorage
Attaches as Authorization: Bearer <token> on all requests
```

---

## 8. Authorization Flow (RBAC)

```
Incoming API request
        │
        ▼
authMiddleware — extract + verify JWT
        │
   Invalid/missing ──► 401 Unauthorized
        │
        ▼
Attach req.user = { userId, role }
        │
        ▼
Route handler checks role permission
        │
   Insufficient role ──► 403 Forbidden
        │
        ▼
For document-scoped actions:
Check user is assigned the relevant RAPID role on this document
        │
   Not assigned ──► 403 Forbidden
        │
        ▼
Proceed with business logic
```

**Role hierarchy:**

| Role | Permissions |
|------|-------------|
| Admin | Full access to all operations |
| Creator | Own document creation and submission |
| Approver | Assigned approval actions only |
| Decision Owner | Finalize and version own documents |
| Performer | Execution completion on assigned documents |
| Auditor | Read-only across ledger, audit log, reports |

---

## 9. RAPID Document Lifecycle

```
[Draft]
   │
   │  POST /documents/:id/submit
   │  (validation engine runs)
   │
   ├── No Agree required ──────────────────► [Submitted → Approved]
   │                                                  │
   └── Agree required ──► [Awaiting Agreement]        │
                                  │                   │
                     ┌────────────┼────────┐          │
                     ▼            ▼        ▼          │
                [Approved]  [Needs Changes] [Rejected] │
                     │            │                   │
                     │     Creator edits              │
                     │     Re-submits                 │
                     └────────────────────────────────┘
                                  │
                     POST /documents/:id/finalize
                     (Decide owner only)
                                  │
                                  ▼
                            [Finalized] ──► LedgerEntry created
                                  │
                     POST /documents/:id/execution-complete
                     (Perform owner only)
                                  │
                                  ▼
                          [Execution Complete]
                                  │
                     POST /documents/:id/version
                     (Decision Owner only)
                                  │
                                  ▼
                     New [Draft v2] created
                     Original remains [Finalized] read-only
```

---

## 10. Approval Workflow

```
Document submitted with Agree roles assigned
        │
        ▼
Backend auto-creates Approval records (status: pending)
for each assigned Agree user
        │
        ▼
Document status → "awaiting_agreement"
        │
        ▼
Each Approver sees pending item in /approvals
        │
   Approver action:
   │
   ├── Approve
   │     approval.status = "approved"
   │     If ALL approvals approved → document.status = "approved"
   │
   ├── Reject
   │     approval.status = "rejected"
   │     document.status = "rejected"
   │     Blocks finalization permanently
   │
   └── Request Changes
         approval.status = "changes_requested"
         document.status = "needs_changes"
         Creator can edit and re-submit
```

---

## 11. Ledger Creation Flow

```
Decide owner calls POST /documents/:id/finalize
        │
        ▼
Validation checks:
  - Document status is "approved" or "submitted" (low-risk)
  - Caller is assigned Decide owner or is Admin
  - Document is not rejected
        │
        ▼
Create LedgerEntry:
  { documentId, documentCode, title, finalDecision,
    decideOwnerId, performOwnerId, riskLevel,
    complianceImpact, version, finalizedAt }
        │
        ▼
Set document.status = "finalized"
Set document.finalizedAt = now()
        │
        ▼
Create AuditLog entries:
  - "document_finalized"
  - "ledger_entry_created"
        │
        ▼
Document becomes read-only
PATCH /documents/:id returns 403 if status = "finalized"
```

---

## 12. Audit Logging Flow

```
Any significant user action
        │
        ▼
Service layer calls createAuditLog({
  actorId:    req.user.userId,
  action:     "document_submitted",
  objectType: "RapidDocument",
  objectId:   documentId,
  details:    { ... }
})
        │
        ▼
INSERT into AuditLog (append-only — no UPDATE or DELETE ever)
        │
        ▼
GET /audit-log returns all entries, newest-first
```

Logged actions: `document_created`, `document_updated`, `role_assigned`, `evidence_added`, `document_submitted`, `approval_added`, `document_rejected`, `changes_requested`, `document_finalized`, `ledger_entry_created`, `version_created`, `execution_completed`, `report_generated`

---

## 13. Reporting Flow

```
Admin or Auditor requests report
        │
        ▼
GET /reports/ledger.csv
(or .md, pending-approvals.csv, high-risk.csv, owner-workload.csv)
        │
        ▼
Backend queries relevant data from DB
        │
        ▼
Formats as CSV (comma-separated) or Markdown (table)
        │
        ▼
Sets Content-Disposition: attachment; filename="report-YYYY-MM-DD.csv"
        │
        ▼
Streams file to browser for download
        │
        ▼
Creates AuditLog entry: "report_generated"
```

---

## 14. Local Development Flow

```
1. Clone repo
   git clone https://github.com/your-username/rapid-ledger.git
   cd rapid-ledger

2. Install dependencies
   npm install

3. Set up environment
   cp apps/api/.env.example apps/api/.env
   (Edit DATABASE_URL and JWT_SECRET)

4. Set up database
   npx prisma migrate dev
   npx prisma db seed

5. Start backend (Terminal 1)
   cd apps/api && npm run dev   → http://localhost:3001

6. Start frontend (Terminal 2)
   cd apps/web && npm run dev   → http://localhost:3000

7. Open http://localhost:3000
   Login with seeded demo credentials (see README)
```

---

## 15. Deployment Architecture

```
GitHub Repository (main branch)
        │
        ├──► Vercel (Frontend)
        │      Auto-deploy on push to main
        │      Build command: cd apps/web && npm run build
        │      Env var: NEXT_PUBLIC_API_URL=https://your-api.railway.app
        │
        └──► Railway (Backend + Database)
               Elysia API service (apps/api)
               PostgreSQL database service
               Env vars: DATABASE_URL, JWT_SECRET, PORT=3001, NODE_ENV=production
```
