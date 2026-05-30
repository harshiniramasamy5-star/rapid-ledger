# Low-Level Design — RAPID Ledger

## 1. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  admin
  creator
  recommender
  approver
  decision_owner
  performer
  auditor
}

enum RiskLevel {
  low
  medium
  high
  critical
}

enum DocumentStatus {
  draft
  validation_failed
  submitted
  awaiting_agreement
  needs_changes
  approved
  rejected
  finalized
  execution_complete
  archived
}

enum RapidRoleType {
  recommend
  agree
  perform
  input
  decide
}

enum EvidenceType {
  file
  link
  note
  policy_reference
  meeting_note
  approval_screenshot
}

enum ApprovalStatus {
  pending
  approved
  rejected
  changes_requested
}

enum AuditAction {
  document_created
  document_updated
  role_assigned
  evidence_added
  document_submitted
  approval_added
  document_rejected
  changes_requested
  document_finalized
  ledger_entry_created
  version_created
  execution_completed
  report_generated
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         UserRole
  department   String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdDocuments  RapidDocument[]      @relation("CreatedBy")
  roleAssignments   RapidRoleAssignment[]
  approvals         Approval[]
  auditLogs         AuditLog[]
  ledgerDecide      LedgerEntry[]        @relation("DecideOwner")
  ledgerPerform     LedgerEntry[]        @relation("PerformOwner")
}

model RapidDocument {
  id                   String         @id @default(cuid())
  documentCode         String
  title                String
  decisionSummary      String
  businessContext      String?
  problemStatement     String?
  proposedDecision     String?
  alternativesConsidered String?
  riskLevel            RiskLevel      @default(low)
  complianceImpact     Boolean        @default(false)
  department           String?
  deadline             DateTime?
  status               DocumentStatus @default(draft)
  version              Int            @default(1)
  parentDocumentId     String?
  createdBy            String
  submittedAt          DateTime?
  finalizedAt          DateTime?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  creator       User                  @relation("CreatedBy", fields: [createdBy], references: [id])
  parent        RapidDocument?        @relation("Versions", fields: [parentDocumentId], references: [id])
  versions      RapidDocument[]       @relation("Versions")
  roles         RapidRoleAssignment[]
  evidence      Evidence[]
  approvals     Approval[]
  ledgerEntry   LedgerEntry?
  auditLogs     AuditLog[]

  @@unique([documentCode, version])
}

model RapidRoleAssignment {
  id         String        @id @default(cuid())
  documentId String
  roleType   RapidRoleType
  userId     String
  createdAt  DateTime      @default(now())

  document RapidDocument @relation(fields: [documentId], references: [id])
  user     User          @relation(fields: [userId], references: [id])

  @@unique([documentId, roleType, userId])
}

model Evidence {
  id          String       @id @default(cuid())
  documentId  String
  type        EvidenceType
  title       String
  urlOrPath   String?
  description String?
  uploadedBy  String
  createdAt   DateTime     @default(now())

  document RapidDocument @relation(fields: [documentId], references: [id])
}

model Approval {
  id         String         @id @default(cuid())
  documentId String
  approverId String
  status     ApprovalStatus @default(pending)
  notes      String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  document RapidDocument @relation(fields: [documentId], references: [id])
  approver User          @relation(fields: [approverId], references: [id])
}

model LedgerEntry {
  id               String   @id @default(cuid())
  documentId       String   @unique
  documentCode     String
  title            String
  finalDecision    String
  decideOwnerId    String
  performOwnerId   String?
  riskLevel        RiskLevel
  complianceImpact Boolean
  version          Int
  finalizedAt      DateTime
  createdAt        DateTime @default(now())

  document      RapidDocument @relation(fields: [documentId], references: [id])
  decideOwner   User          @relation("DecideOwner", fields: [decideOwnerId], references: [id])
  performOwner  User?         @relation("PerformOwner", fields: [performOwnerId], references: [id])
}

model AuditLog {
  id         String      @id @default(cuid())
  actorId    String
  action     AuditAction
  objectType String
  objectId   String
  details    Json?
  createdAt  DateTime    @default(now())

  actor User @relation(fields: [actorId], references: [id])
}
```

---

## 2. API Route Contracts

### Auth

#### POST /auth/login
Request:
```json
{
  "email": "admin@rapid.com",
  "password": "password123"
}
```
Response 200:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "clx...",
    "name": "Alice Admin",
    "email": "admin@rapid.com",
    "role": "admin",
    "department": "Engineering"
  }
}
```
Response 401:
```json
{ "error": { "code": "AUTH_REQUIRED", "message": "Invalid email or password" } }
```

#### GET /auth/me
Headers: `Authorization: Bearer <token>`

Response 200:
```json
{
  "id": "clx...",
  "name": "Alice Admin",
  "email": "admin@rapid.com",
  "role": "admin"
}
```

---

### Users

#### POST /users (Admin only)
Request:
```json
{
  "name": "John Doe",
  "email": "john@rapid.com",
  "password": "securepassword",
  "role": "creator",
  "department": "Product"
}
```
Response 201:
```json
{
  "id": "clx...",
  "name": "John Doe",
  "email": "john@rapid.com",
  "role": "creator",
  "isActive": true
}
```

#### PATCH /users/:id (Admin only)
Request (any subset):
```json
{
  "isActive": false,
  "role": "approver",
  "department": "Legal"
}
```

---

### Documents

#### POST /documents
Request:
```json
{
  "title": "Migrate to AWS S3",
  "decisionSummary": "Move all file storage from local disk to S3",
  "riskLevel": "high",
  "complianceImpact": true,
  "department": "Engineering",
  "deadline": "2026-06-15T00:00:00.000Z",
  "businessContext": "Current local storage is not scalable",
  "problemStatement": "We need distributed file storage",
  "proposedDecision": "Use AWS S3 with versioning enabled",
  "alternativesConsidered": "GCS, Azure Blob Storage"
}
```
Response 201:
```json
{
  "id": "clx...",
  "documentCode": "RAPID-001",
  "status": "draft",
  "version": 1
}
```

#### POST /documents/:id/submit
No request body required.

Response 200 (low-risk, no Agree):
```json
{ "status": "approved" }
```
Response 200 (high-risk, has Agree):
```json
{ "status": "awaiting_agreement" }
```
Response 422 (validation failed):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Document validation failed",
    "details": [
      { "field": "roles.decide", "rule": "exactly_one_decide_required", "message": "Exactly one Decide owner is required" },
      { "field": "roles.agree", "rule": "agree_required_for_high_risk", "message": "High-risk decisions require at least one Agree approver" }
    ]
  }
}
```

#### POST /documents/:id/finalize
Response 200:
```json
{
  "status": "finalized",
  "ledgerEntryId": "clx..."
}
```

#### POST /documents/:id/version
Response 201:
```json
{
  "id": "clx...",
  "documentCode": "RAPID-001",
  "version": 2,
  "status": "draft",
  "parentDocumentId": "clx-original..."
}
```

#### POST /documents/:id/execution-complete
Request:
```json
{ "executionNotes": "All tasks completed and verified on staging." }
```
Response 200:
```json
{ "status": "execution_complete" }
```

---

### Roles

#### POST /documents/:id/roles
Request:
```json
{
  "roleType": "decide",
  "userId": "clx..."
}
```
Response 201:
```json
{
  "id": "clx...",
  "documentId": "clx...",
  "roleType": "decide",
  "userId": "clx..."
}
```

#### DELETE /documents/:id/roles/:roleAssignmentId
Response 204: No content

---

### Evidence

#### POST /documents/:id/evidence
Request:
```json
{
  "type": "link",
  "title": "Risk Assessment Document",
  "urlOrPath": "https://docs.company.com/risk-assessment-2026",
  "description": "Full risk assessment reviewed by security team"
}
```
Response 201:
```json
{
  "id": "clx...",
  "type": "link",
  "title": "Risk Assessment Document"
}
```

---

### Approvals

#### GET /approvals/my
Response 200:
```json
[
  {
    "id": "clx...",
    "status": "pending",
    "document": {
      "id": "clx...",
      "documentCode": "RAPID-003",
      "title": "Migrate to AWS S3",
      "riskLevel": "high"
    }
  }
]
```

#### POST /documents/:id/approvals/:approvalId/approve
Request:
```json
{ "notes": "Reviewed the risk assessment. Approved." }
```
Response 200:
```json
{ "approvalStatus": "approved", "documentStatus": "approved" }
```

#### POST /documents/:id/approvals/:approvalId/reject
Request:
```json
{ "notes": "The risk assessment is incomplete. Missing threat model." }
```
Response 200:
```json
{ "approvalStatus": "rejected", "documentStatus": "rejected" }
```

#### POST /documents/:id/approvals/:approvalId/request-changes
Request:
```json
{ "notes": "Please add a rollback plan before resubmitting." }
```
Response 200:
```json
{ "approvalStatus": "changes_requested", "documentStatus": "needs_changes" }
```

---

### Ledger

#### GET /ledger
Query params: `riskLevel`, `department`, `decideOwner`, `complianceImpact`, `version`

Response 200:
```json
[
  {
    "id": "clx...",
    "documentCode": "RAPID-001",
    "title": "Migrate to AWS S3",
    "finalDecision": "Approved migration to AWS S3 with versioning",
    "riskLevel": "high",
    "complianceImpact": true,
    "version": 1,
    "finalizedAt": "2026-05-20T10:00:00.000Z",
    "decideOwner": { "name": "Alice Admin" },
    "performOwner": { "name": "Dave Performer" }
  }
]
```

---

### Reports

#### GET /reports/ledger.csv
Response: CSV file download
```
Content-Disposition: attachment; filename="ledger-2026-05-20.csv"
Content-Type: text/csv

documentCode,title,riskLevel,complianceImpact,version,finalizedAt,decideOwner,performOwner
RAPID-001,Migrate to AWS S3,high,true,1,2026-05-20,Alice Admin,Dave Performer
```

#### GET /reports/ledger.md
Response: Markdown file download

#### GET /reports/pending-approvals.csv
Response: CSV of all pending approval items

#### GET /reports/high-risk.csv
Response: CSV of all high-risk and critical documents

#### GET /reports/owner-workload.csv
Response: CSV of document counts per owner

---

## 3. Zod Validation Schemas

```typescript
// packages/shared/src/schemas/document.schema.ts
import { z } from "zod";

export const CreateDocumentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  decisionSummary: z.string().min(10, "Decision summary is required"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
  complianceImpact: z.boolean().default(false),
  department: z.string().optional(),
  deadline: z.string().datetime().optional(),
  businessContext: z.string().optional(),
  problemStatement: z.string().optional(),
  proposedDecision: z.string().optional(),
  alternativesConsidered: z.string().optional(),
});

export const AssignRoleSchema = z.object({
  roleType: z.enum(["recommend", "agree", "perform", "input", "decide"]),
  userId: z.string().cuid(),
});

export const AddEvidenceSchema = z.object({
  type: z.enum(["file", "link", "note", "policy_reference", "meeting_note", "approval_screenshot"]),
  title: z.string().min(1, "Evidence title is required"),
  urlOrPath: z.string().url().optional(),
  description: z.string().optional(),
});

export const ApprovalActionSchema = z.object({
  notes: z.string().min(1, "Notes are required for approval actions"),
});

export const LoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "creator", "recommender", "approver", "decision_owner", "performer", "auditor"]),
  department: z.string().optional(),
});

export const ExecutionCompleteSchema = z.object({
  executionNotes: z.string().min(10, "Execution notes are required"),
});
```

---

## 4. RBAC Permission Matrix

| Action | Admin | Creator | Recommender | Approver | Decision Owner | Performer | Auditor |
|--------|-------|---------|-------------|----------|----------------|-----------|---------|
| Create document | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit draft document | ✅ | Own only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit needs_changes document | ✅ | Own only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | Own draft | ❌ | ❌ | ❌ | ❌ | ❌ |
| Add evidence | ✅ | Own draft/needs_changes | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit document | ✅ | Own valid draft | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve/Reject/Changes | ✅ | ❌ | ❌ | Assigned only | ❌ | ❌ | ❌ |
| Finalize document | ✅ | ❌ | ❌ | ❌ | Assigned only | ❌ | ❌ |
| Mark execution complete | ✅ | ❌ | ❌ | ❌ | ❌ | Assigned only | ❌ |
| Create new version | ✅ | ❌ | ❌ | ❌ | Assigned only | ❌ | ❌ |
| View all documents | ✅ | Own only | Assigned | Assigned | Assigned | Assigned | ✅ |
| View ledger | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View audit log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export reports | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deactivate users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Status Transition Table

| From Status | Action | To Status | Who Can Trigger | Condition |
|-------------|--------|-----------|-----------------|-----------|
| draft | submit | submitted | Creator, Admin | Validation passes, no Agree roles |
| draft | submit | awaiting_agreement | Creator, Admin | Validation passes, has Agree roles |
| draft | submit | validation_failed | System | Validation fails |
| awaiting_agreement | all approved | approved | System | All Approval records = approved |
| awaiting_agreement | any rejected | rejected | System | Any Approval record = rejected |
| awaiting_agreement | any changes_requested | needs_changes | System | Any Approval record = changes_requested |
| needs_changes | submit | submitted / awaiting_agreement | Creator, Admin | Re-validation passes |
| submitted | finalize | finalized | Decide owner, Admin | No Agree roles required |
| approved | finalize | finalized | Decide owner, Admin | All approvals approved |
| finalized | execution-complete | execution_complete | Performer, Admin | Execution notes provided |
| finalized | version | (new draft v2) | Decision Owner, Admin | Original remains finalized |
| rejected | — | rejected (terminal) | — | Cannot be finalized |
| finalized | direct edit | 403 Forbidden | — | Must create new version |

---

## 6. Validation Engine Rules

```typescript
// apps/api/src/services/validation.service.ts

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: "error";
}

// Rules checked before submission:

const rules = [
  {
    rule: "title_required",
    field: "title",
    check: (doc) => !!doc.title,
    message: "Title is required",
  },
  {
    rule: "decision_summary_required",
    field: "decisionSummary",
    check: (doc) => !!doc.decisionSummary,
    message: "Decision summary is required",
  },
  {
    rule: "recommend_owner_required",
    field: "roles.recommend",
    check: (doc, roles) => roles.some(r => r.roleType === "recommend"),
    message: "A Recommend owner is required",
  },
  {
    rule: "perform_owner_required",
    field: "roles.perform",
    check: (doc, roles) => roles.some(r => r.roleType === "perform"),
    message: "A Perform owner is required",
  },
  {
    rule: "exactly_one_decide_required",
    field: "roles.decide",
    check: (doc, roles) => roles.filter(r => r.roleType === "decide").length === 1,
    message: "Exactly one Decide owner is required",
  },
  {
    rule: "deadline_not_in_past",
    field: "deadline",
    check: (doc) => !doc.deadline || new Date(doc.deadline) > new Date(),
    message: "Deadline must be in the future",
  },
  {
    rule: "agree_required_for_high_risk",
    field: "roles.agree",
    check: (doc, roles) =>
      !["high", "critical"].includes(doc.riskLevel) ||
      roles.some(r => r.roleType === "agree"),
    message: "High-risk decisions require at least one Agree approver",
  },
  {
    rule: "evidence_required_for_compliance",
    field: "evidence",
    check: (doc, roles, evidence) =>
      !doc.complianceImpact || evidence.length > 0,
    message: "Compliance-impacting decisions require evidence",
  },
];
```

---

## 7. Error Handling Strategy

All API errors return a consistent JSON structure:

```typescript
// Standard error envelope
{
  "error": {
    "code": "ERROR_CODE",       // machine-readable constant
    "message": "Human message", // user-friendly description
    "details": [                // optional array for validation errors
      {
        "field": "roles.decide",
        "rule": "exactly_one_decide_required"
      }
    ]
  }
}
```

**Error codes and HTTP status mapping:**

| Code | HTTP Status | When Used |
|------|-------------|-----------|
| `AUTH_REQUIRED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | Valid token but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Business rule validation failure |
| `INVALID_STATUS_TRANSITION` | 422 | Attempted illegal state change |
| `DUPLICATE_RECORD` | 409 | Unique constraint violation (e.g. email) |
| `DATABASE_ERROR` | 500 | Prisma/DB error |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

**Backend middleware:**
```typescript
// Global error handler in Elysia
app.onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.httpStatus;
    return { error: { code: error.code, message: error.message, details: error.details } };
  }
  set.status = 500;
  return { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } };
});
```

---

## 8. Test Case Mapping

| Test File | Test Cases | Covers |
|-----------|------------|--------|
| `apps/api/tests/validation.test.ts` | 18 unit tests | All 8 validation rules, edge cases |
| `apps/api/tests/api.test.ts` | 13 API tests | Login, create, submit, approve, finalize, ledger, export |
| `apps/web/tests/components/` | 8 component tests | Login form, role UI, approval buttons, finalize button |
| `apps/web/tests/e2e/` | 1 full flow (stub) | Admin → Creator → Approver → Decide → Ledger |

### Unit Test Coverage Map

| Rule | Test Case |
|------|-----------|
| Title required | `should fail if title is empty` |
| Decision summary required | `should fail if decisionSummary is empty` |
| Recommend owner required | `should fail if no recommend role assigned` |
| Perform owner required | `should fail if no perform role assigned` |
| Exactly one Decide owner | `should fail if zero decide owners` |
| Exactly one Decide owner | `should fail if two decide owners` |
| Exactly one Decide owner | `should pass with exactly one decide owner` |
| Agree for high-risk | `should fail high-risk without agree approver` |
| Agree for critical | `should fail critical without agree approver` |
| Evidence for compliance | `should fail compliance-impact without evidence` |
| Low-risk no Agree | `should pass low-risk without agree approver` |
| Rejected not finalizable | `should fail finalization if status is rejected` |
| Valid doc passes | `should return valid for complete low-risk document` |
| Valid high-risk passes | `should return valid for high-risk with agree approver` |

---

## 9. Seed Data

Six demo users seeded for local development and evaluation:

| Name | Email | Password | Role |
|------|-------|----------|------|
| Alice Admin | admin@rapid.com | password123 | admin |
| Charlie Creator | creator@rapid.com | password123 | creator |
| Bob Recommender | recommender@rapid.com | password123 | recommender |
| Aria Approver | approver@rapid.com | password123 | approver |
| Dana Decider | decider@rapid.com | password123 | decision_owner |
| Dave Performer | performer@rapid.com | password123 | performer |

Sample documents seeded: 2 draft, 1 awaiting agreement, 1 finalized, covering all risk levels.

---

## 10. Environment Variables

```bash
# apps/api/.env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rapid_ledger"

# Auth
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRY="24h"

# Server
PORT=3001
NODE_ENV="development"
```

```bash
# apps/web/.env.example

# API connection
NEXT_PUBLIC_API_URL="http://localhost:3001"
```
