# API Reference

Base URL: `http://localhost:3001`  
Authentication: All endpoints except `/auth/login` require `Authorization: Bearer <token>` header.

---

## Authentication

### POST /auth/login
Authenticate a user and receive a JWT token.

**Request Body**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "admin | creator | approver | viewer"
  }
}
```

**Response 401**
```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password", "details": [] } }
```

---

## Users

### GET /users
Returns all users. Admin only.

**Response 200**
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "department": "string",
    "createdAt": "ISO8601"
  }
]
```

---

## RAPID Documents

### GET /documents
Returns all documents visible to the authenticated user.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| status | string | Filter by status (draft, submitted, approved, etc.) |
| search | string | Search by title or document code |
| riskLevel | string | Filter by risk level (low, medium, high, critical) |

**Response 200**
```json
[
  {
    "id": "string",
    "documentCode": "RAPID-001",
    "title": "string",
    "status": "draft | submitted | awaiting_agreement | approved | rejected | needs_changes | finalized | completed",
    "riskLevel": "low | medium | high | critical",
    "complianceImpact": 0,
    "version": 1,
    "createdBy": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

### POST /documents
Create a new RAPID document.

**Request Body**
```json
{
  "title": "string",
  "decisionSummary": "string",
  "businessContext": "string",
  "problemStatement": "string",
  "proposedDecision": "string",
  "alternativesConsidered": "string",
  "riskLevel": "low | medium | high | critical",
  "complianceImpact": false,
  "department": "string",
  "deadline": "ISO8601"
}
```

**Response 201** — returns created document object.

**Response 400**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "string", "details": [{ "field": "string", "rule": "string" }] } }
```

### GET /documents/:id
Returns full document with role assignments, evidence, and approvals.

**Response 200**
```json
{
  "id": "string",
  "documentCode": "string",
  "title": "string",
  "status": "string",
  "riskLevel": "string",
  "complianceImpact": 0,
  "version": 1,
  "RapidRoleAssignment": [
    { "id": "string", "role": "R | A | P | I | D", "userId": "string", "user": { "name": "string", "email": "string" } }
  ],
  "Evidence": [
    { "id": "string", "type": "link | note | file", "urlOrPath": "string", "description": "string" }
  ],
  "Approval": [
    { "id": "string", "status": "pending | approved | rejected | needs_changes", "userId": "string" }
  ]
}
```

### PATCH /documents/:id
Update a document. Only allowed when status is `draft` or `needs_changes`.
Returns `403` if the document is `finalized` (immutable).
Returns `409` if the document is in any other non-editable status.
Update a draft document.

**Request Body** — same fields as POST /documents (all optional).

**Response 200** — returns updated document object.

### POST /documents/:id/submit
Submit a document for approval. Triggers validation engine.

**Validation Rules Enforced**
- Exactly one Decide (D) owner required
- At least one Recommend (R) owner required
- At least one Perform (P) owner required
- High-risk documents require at least one Agree (A) approver
- Compliance-impacting documents require at least one evidence item

**Response 200** — returns updated document with status `submitted` or `awaiting_agreement`.

**Response 400** — validation failure with details array.

### POST /documents/:id/approve
Approve a document (approver only).

**Request Body**
```json
{ "notes": "string" }
```

**Response 200** — returns updated approval record.

### POST /documents/:id/reject
Reject a document (approver only).

**Request Body**
```json
{ "notes": "string" }
```

### POST /documents/:id/needs-changes
Request changes on a document (approver only).

**Request Body**
```json
{ "notes": "string" }
```

### POST /documents/:id/finalize
Finalize a document. Only the Decide (D) owner can finalize. Document must be in `approved` status.

**Response 200** — returns document with status `finalized`. A LedgerEntry is created automatically.

### POST /documents/:id/complete
Mark execution complete. Only the Perform (P) owner can complete. Document must be in `finalized` status.

**Response 200** — returns document with status `completed`.

### POST /documents/:id/version
Create a new version from a finalized document.

**Response 201** — returns new document with `version: n+1` and status `draft`.

---

## Role Assignments

### POST /documents/:id/roles
Assign a RAPID role to a user on a document.

**Request Body**
```json
{
  "userId": "string",
  "role": "R | A | P | I | D"
}
```

**Response 201** — returns role assignment object.

### DELETE /documents/:id/roles/:roleId
Remove a role assignment from a document.

**Response 200**

---

## Evidence

### POST /documents/:id/evidence
Attach evidence to a document.

**Request Body**
```json
{
  "type": "link | note | file",
  "urlOrPath": "string",
  "description": "string"
}
```

**Response 201** — returns evidence object.

---

## Approvals

### GET /approvals/my
Returns all pending approvals for the authenticated user.

**Response 200**
```json
[
  {
    "id": "string",
    "status": "pending",
    "document": {
      "id": "string",
      "documentCode": "string",
      "title": "string",
      "riskLevel": "string",
      "complianceImpact": 0,
      "decisionSummary": "string"
    }
  }
]
```

---

## RAPID Ledger

### GET /ledger
Returns all finalized ledger entries (read-only).

**Response 200**
```json
[
  {
    "id": "string",
    "documentId": "string",
    "finalizedAt": "ISO8601",
    "document": {
      "documentCode": "string",
      "title": "string",
      "riskLevel": "string",
      "version": 1
    }
  }
]
```

---

## Audit Log

### GET /audit-log
Returns all audit log entries. Admin only.

**Response 200**
```json
[
  {
    "id": "string",
    "action": "string",
    "entityType": "string",
    "entityId": "string",
    "userId": "string",
    "createdAt": "ISO8601",
    "user": { "name": "string", "email": "string" }
  }
]
```

---

## Reports

> Note: CSV and Markdown exports are available via `GET /ledger/export/csv` and `GET /ledger/export/markdown`.

### GET /reports/csv
Download a CSV export of all RAPID documents.

**Response 200** — `Content-Type: text/csv`

### GET /reports/markdown
Download a Markdown export of all RAPID documents.

**Response 200** — `Content-Type: text/markdown`

### GET /reports/pending-approvals
Returns count and list of documents with pending approvals.

### GET /reports/high-risk
Returns all high and critical risk documents.

### GET /reports/overdue
Returns documents past their deadline that are not yet finalized.

### GET /reports/owner-workload
Returns per-user counts of documents assigned across RAPID roles.

---

## Error Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": [
      { "field": "fieldName", "rule": "ruleDescription" }
    ]
  }
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Validation error or bad request |
| 401 | Missing or invalid JWT token |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 500 | Internal server error |
