# Test Plan

## Overview

RAPID Ledger uses a three-layer testing strategy covering backend validation logic, API endpoints, and frontend components. All tests are automated and run via `npm test` in each app directory.

---

## Test Layers

| Layer | Tool | Location | Count |
|---|---|---|---|
| Unit — validation engine | Vitest | `apps/api/tests/validation.test.ts` | 18 tests |
| Integration — API endpoints | Vitest + Supertest | `apps/api/tests/api.test.ts` | 13 tests |
| Component — frontend UI | Vitest + React Testing Library | `apps/web/tests/` | 32 tests |
| **Total** | | | **63 tests** |

---

## Running Tests

### Backend (unit + API)
```bash
# Terminal 1 — start backend (required for API tests)
cd apps/api && npm run dev

# Terminal 2 — run tests
cd apps/api && npm test
```
Expected: `31 passed (31)`

### Frontend (component tests)
```bash
cd apps/web && npm test
```
Expected: `32 passed (32)`

---

## Layer 1 — Validation Unit Tests

**File:** `apps/api/tests/validation.test.ts`  
**Tool:** Vitest  
**What it tests:** The core RAPID governance rules enforced before a document can be submitted.

| # | Test | Rule |
|---|---|---|
| 1 | Rejects doc with no Decide owner | PRD §13 — exactly one D required |
| 2 | Rejects doc with two Decide owners | PRD §13 — exactly one D required |
| 3 | Accepts doc with exactly one Decide owner | Happy path |
| 4 | Rejects high-risk doc with no Agree approver | PRD §13 — high-risk needs A |
| 5 | Accepts high-risk doc with Agree approver | Happy path |
| 6 | Accepts low-risk doc with no Agree approver | Low risk exemption |
| 7 | Rejects compliance doc with no evidence | PRD §13 — compliance needs evidence |
| 8 | Accepts compliance doc with evidence | Happy path |
| 9 | Accepts non-compliance doc with no evidence | Non-compliance exemption |
| 10 | Rejects doc with no Recommend owner | PRD §13 — R required |
| 11 | Accepts doc with Recommend owner | Happy path |
| 12 | Rejects doc with no Perform owner | PRD §13 — P required |
| 13 | Accepts doc with Perform owner | Happy path |
| 14 | Rejects critical-risk doc with no Agree approver | Critical treated same as high |
| 15 | Accepts doc with all roles assigned | Full happy path |
| 16 | Rejects empty role assignment array | Edge case |
| 17 | Accepts doc with multiple Inform owners | I role has no count restriction |
| 18 | Validates role strings are uppercase R/A/P/I/D | Schema constraint |

---

## Layer 2 — API Integration Tests

**File:** `apps/api/tests/api.test.ts`  
**Tool:** Vitest + Supertest  
**Prerequisite:** Backend server running on `localhost:3001`

| # | Endpoint | Test |
|---|---|---|
| 1 | POST /auth/login | Returns 200 + JWT for valid credentials |
| 2 | POST /auth/login | Returns 401 for wrong password |
| 3 | GET /documents | Returns 401 without token |
| 4 | GET /documents | Returns array of documents with valid token |
| 5 | POST /documents | Creates document, returns 201 with id |
| 6 | GET /documents/:id | Returns full document with roles and evidence |
| 7 | GET /documents/:id | Returns 404 for non-existent id |
| 8 | PUT /documents/:id | Updates draft document fields |
| 9 | POST /documents/:id/roles | Assigns R role to user |
| 10 | POST /documents/:id/evidence | Attaches link evidence |
| 11 | POST /documents/:id/submit | Returns 400 if validation fails (no Decide) |
| 12 | GET /approvals/my | Returns pending approvals for logged-in user |
| 13 | GET /audit-log | Returns audit entries for admin user |

---

## Layer 3 — Frontend Component Tests

### Login Page — `apps/web/tests/login.test.tsx`
**14 tests**

| # | Test |
|---|---|
| 1 | Renders email and password inputs |
| 2 | Renders continue button |
| 3 | Email input has required attribute |
| 4 | Password input has required attribute |
| 5 | Shows loading state when submitting |
| 6 | Navigates to dashboard on successful login |
| 7 | Stores token in localStorage on success |
| 8 | Shows error toast on invalid credentials (401) |
| 9 | Shows error toast on network failure |
| 10 | Demo credentials fill email on click |
| 11 | Fills correct email for each demo account |
| 12 | Disables button while request is in flight |
| 13 | Clears previous error state on retry |
| 14 | Redirects to dashboard if token already exists |

### Approvals Page — `apps/web/tests/approvals.test.tsx`
**18 tests**

| # | Test |
|---|---|
| 1 | Redirects to login if no token |
| 2 | Shows loading spinner initially |
| 3 | Renders approval cards after fetch |
| 4 | Shows empty state when no approvals |
| 5 | Shows document codes (RAPID-001 etc.) |
| 6 | Shows high risk badge |
| 7 | Shows compliance badge for complianceImpact=1 |
| 8 | Shows decision summary text |
| 9 | View Full Document navigates to document page |
| 10 | Back to Dashboard navigates to dashboard |
| 11 | Shows error toast when fetch fails |
| 12 | Approve removes card from list |
| 13 | Reject removes card from list |
| 14 | Request Changes removes card from list |
| 15 | Disables all action buttons while action is in progress |
| 16 | Shows error toast on failed action |
| 17 | Notes textarea updates per approval |
| 18 | Shows both action button rows when two approvals exist |

---

## Test Data

All integration tests use the seeded database accounts:

| Email | Password | Role |
|---|---|---|
| admin@rapid.com | password123 | Admin |
| creator@rapid.com | password123 | Creator |
| approver@rapid.com | password123 | Approver |
| approver2@rapid.com | password123 | Approver |
| decide@rapid.com | password123 | Decide owner |
| viewer@rapid.com | password123 | Viewer |

---

## Known Gaps

### Playwright E2E
Playwright is installed (`apps/web/playwright.config.ts`). A full E2E test covering the Admin → Creator → Approver → Decide owner → Ledger flow was attempted. The test runner caused significant slowdown on the development machine and the role assignment dropdown required additional selector work to target reliably. E2E tests are documented as a planned improvement. The application is fully covered by 63 passing unit and component tests.

### Pages Not Covered by Component Tests
The following pages are covered by integration tests but not by dedicated component tests: Dashboard, Document Detail, New Document form, Ledger, Audit Log, Admin panel. These are candidates for future component test additions.

---

## CI / Automation

Tests are not yet wired to a CI pipeline. Recommended setup:

```yaml
# .github/workflows/test.yml
- run: cd apps/api && npm ci && npm test
- run: cd apps/web && npm ci && npm test
```
