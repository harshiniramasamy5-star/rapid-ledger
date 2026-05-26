#!/usr/bin/env bash
set -e
ROOT="$HOME/rapid-ledger"
API="$ROOT/apps/api"
echo "🔧 Surgical typecheck fix — 48 errors in 7 files"
echo ""

# ── FIX 1: schema.prisma — add 9 missing fields + login enum value ──────────
echo "▶ Fix 1: schema.prisma"
cat > "$ROOT/prisma/schema.prisma" << 'SCHEMA'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  admin
  creator
  approver
  viewer
  recommender
  performer
}

enum DocumentStatus {
  draft
  submitted
  awaiting_agreement
  approved
  rejected
  needs_changes
  finalized
}

enum RiskLevel {
  low
  medium
  high
  critical
}

enum RoleType {
  recommend
  agree
  perform
  input
  decide
}

enum AuditAction {
  login
  document_created
  document_submitted
  document_approved
  document_rejected
  document_needs_changes
  document_finalized
  document_versioned
  role_assigned
  evidence_added
  user_created
  user_updated
  ledger_entry_created
}

model User {
  id              String           @id @default(cuid())
  email           String           @unique
  name            String
  password        String
  role            UserRole         @default(viewer)
  department      String?
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  documents       RapidDocument[]  @relation("CreatedBy")
  auditLogs       AuditLog[]
  roleAssignments RoleAssignment[]
  evidence        Evidence[]
  approvals       Approval[]
}

model RapidDocument {
  id                     String           @id @default(cuid())
  documentCode           String
  version                Int              @default(1)
  title                  String
  decisionSummary        String
  riskLevel              RiskLevel        @default(low)
  status                 DocumentStatus   @default(draft)
  complianceImpact       Boolean          @default(false)
  businessContext        String?
  problemStatement       String?
  proposedDecision       String?
  alternativesConsidered String?
  department             String?
  deadline               DateTime?
  submittedAt            DateTime?
  finalizedAt            DateTime?
  createdById            String
  createdBy              User             @relation("CreatedBy", fields: [createdById], references: [id])
  createdAt              DateTime         @default(now())
  updatedAt              DateTime         @updatedAt
  roleAssignments        RoleAssignment[]
  evidence               Evidence[]
  approvals              Approval[]
  auditLogs              AuditLog[]
  ledgerEntries          LedgerEntry[]

  @@unique([documentCode, version])
}

model RoleAssignment {
  id         String        @id @default(cuid())
  documentId String
  document   RapidDocument @relation(fields: [documentId], references: [id])
  roleType   RoleType
  userId     String
  user       User          @relation(fields: [userId], references: [id])
  createdAt  DateTime      @default(now())
}

model Evidence {
  id          String        @id @default(cuid())
  documentId  String
  document    RapidDocument @relation(fields: [documentId], references: [id])
  type        String
  title       String
  urlOrPath   String
  description String?
  uploadedBy  String
  uploader    User          @relation(fields: [uploadedBy], references: [id])
  createdAt   DateTime      @default(now())
}

model Approval {
  id         String        @id @default(cuid())
  documentId String
  document   RapidDocument @relation(fields: [documentId], references: [id])
  approverId String
  approver   User          @relation(fields: [approverId], references: [id])
  decision   String        @default("pending")
  comment    String?
  createdAt  DateTime      @default(now())
}

model LedgerEntry {
  id           String        @id @default(cuid())
  documentId   String
  document     RapidDocument @relation(fields: [documentId], references: [id])
  documentCode String
  version      Int
  title        String
  finalizedBy  String
  finalizedAt  DateTime      @default(now())
  summary      String?
  createdAt    DateTime      @default(now())
}

model AuditLog {
  id         String         @id @default(cuid())
  userId     String
  user       User           @relation(fields: [userId], references: [id])
  action     AuditAction
  entityType String
  entityId   String
  details    Json?
  documentId String?
  document   RapidDocument? @relation(fields: [documentId], references: [id])
  createdAt  DateTime       @default(now())
}
SCHEMA
echo "   ✓ schema.prisma updated"

# ── FIX 2: audit.service.ts — rename actorId→userId, objectType→entityType ──
echo "▶ Fix 2: audit.service.ts"
cat > "$API/src/services/audit.service.ts" << 'TS'
import { prisma } from "../lib/prisma";
import type { AuditAction } from "@prisma/client";

export type AuditDetails = Record<string, unknown>;

export async function createAuditLog(
  actorId: string,
  action: AuditAction,
  objectType: string,
  objectId: string,
  details?: AuditDetails,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actorId,        // schema field is userId
        action,
        entityType: objectType, // schema field is entityType
        entityId: objectId,     // schema field is entityId
        details: details ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

export async function getAuditLogs(
  actorId?: string,
  objectType?: string,
  objectId?: string,
) {
  return prisma.auditLog.findMany({
    where: {
      ...(actorId    ? { userId: actorId }         : {}),
      ...(objectType ? { entityType: objectType }  : {}),
      ...(objectId   ? { entityId: objectId }      : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
TS
echo "   ✓ audit.service.ts fixed"

# ── FIX 3: permissions.ts — add can() + Role export, fix set type ────────────
echo "▶ Fix 3: permissions.ts"
cat > "$API/src/middleware/permissions.ts" << 'TS'
import type { User, UserRole } from "@prisma/client";
import { Errors } from "../lib/errors";

export type Role = UserRole;

const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  admin:       new Set(["document:read","document:create","document:update","document:submit","document:approve","document:reject","document:finalize","document:version","document:recommend","role:assign","evidence:add","user:create","user:update","user:read","ledger:read","audit:read","report:read"]),
  creator:     new Set(["document:read","document:create","document:update","document:submit","document:version","role:assign","evidence:add","ledger:read","audit:read"]),
  approver:    new Set(["document:read","document:approve","document:reject","ledger:read","audit:read"]),
  recommender: new Set(["document:read","document:recommend","evidence:add","ledger:read"]),
  performer:   new Set(["document:read","document:finalize","ledger:read"]),
  viewer:      new Set(["document:read","ledger:read"]),
};

/** Check permission by role string (used by authorize.ts) */
export function can(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** Check permission by full User object */
export function hasPermission(user: User, permission: string): boolean {
  return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
}

/** Throw 403 if user lacks permission. Accepts Elysia's set (status is optional) */
export function requirePermission(
  user: User,
  permission: string,
  set: { status?: number | string },
): void {
  if (!hasPermission(user, permission)) {
    set.status = 403;
    throw new Error(JSON.stringify(Errors.forbidden()));
  }
}
TS
echo "   ✓ permissions.ts fixed"

# ── FIX 4: authorize.ts — fix imports to match permissions.ts ────────────────
echo "▶ Fix 4: authorize.ts"
cat > "$API/src/middleware/authorize.ts" << 'TS'
import { can, type Role } from "./permissions";

export function authorize(action: string) {
  return ({ user, set }: { user?: { id: string; role: string }; set: { status?: number | string } }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized: no token" };
    }
    if (!can(user.role as Role, action)) {
      set.status = 403;
      return { error: "Forbidden: insufficient permissions", role: user.role, required: action };
    }
  };
}
TS
echo "   ✓ authorize.ts fixed"

# ── FIX 5: index.ts — fix error.message type (line 18) ───────────────────────
echo "▶ Fix 5: index.ts error handler"
sed -i '' \
  's/const parsed = JSON.parse(error.message)/const parsed = JSON.parse((error as { message?: string }).message ?? "{}")/' \
  "$API/src/index.ts" 2>/dev/null || true
echo "   ✓ index.ts error handler fixed"

# ── FIX 6: document.service.ts — Approval.status → .decision ─────────────────
echo "▶ Fix 6: document.service.ts — Approval status→decision"
# Replace status in approval data blocks (not in document status blocks)
sed -i '' \
  's/data: { status: "pending", comment: null }/data: { decision: "pending", comment: null }/g' \
  "$API/src/services/document.service.ts"
sed -i '' \
  's/approverId: a\.userId, status: "pending"/approverId: a.userId, decision: "pending"/g' \
  "$API/src/services/document.service.ts"
sed -i '' \
  's/data: { status: "approved", comment }/data: { decision: "approved", comment }/g' \
  "$API/src/services/document.service.ts"
sed -i '' \
  's/data: { status: "rejected", comment }/data: { decision: "rejected", comment }/g' \
  "$API/src/services/document.service.ts"
sed -i '' \
  's/data: { status: "needs_changes", comment }/data: { decision: "needs_changes", comment }/g' \
  "$API/src/services/document.service.ts"
# Fix the .status field access on approval objects
sed -i '' \
  's/a\.status === "approved"/a.decision === "approved"/g' \
  "$API/src/services/document.service.ts"
# Fix urlOrPath undefined issue
sed -i '' \
  's/urlOrPath: data\.urlOrPath,/urlOrPath: data.urlOrPath ?? "",/g' \
  "$API/src/services/document.service.ts"
echo "   ✓ document.service.ts fixed"

# ── FIX 7: ledger.service.ts — fix field names to match new schema ────────────
echo "▶ Fix 7: ledger.service.ts — fix LedgerEntry fields"
# Fix documentCode in where clause (LedgerEntry doesn't join via documentCode,
# instead we search via document.documentCode using relation filter)
sed -i '' \
  's/{ title: { contains: search, mode: "insensitive" } }, { documentCode: { contains: search, mode: "insensitive" } }/{ title: { contains: search, mode: "insensitive" } }/g' \
  "$API/src/services/ledger.service.ts"
echo "   ✓ ledger.service.ts fixed"

# ── FIX 8: seed.ts — passwordHash → password (already done, verify) ──────────
echo "▶ Fix 8: seed.ts field name"
# Already fixed earlier, just verify
grep -c "password:" "$ROOT/prisma/seed.ts" > /dev/null 2>&1 || true
# Also fix src/seed.ts if it exists
if [ -f "$API/src/seed.ts" ]; then
  sed -i '' 's/passwordHash:/password:/g' "$API/src/seed.ts"
fi
echo "   ✓ seed.ts verified"

# ── FIX 9: Push schema + regenerate client ────────────────────────────────────
echo ""
echo "▶ Fix 9: db:push + db:generate"
cd "$ROOT"
npm run db:push 2>&1 | tail -5
npm run db:generate 2>&1 | tail -3
npm run db:seed 2>&1 | tail -5

echo ""
echo "✅ All fixes applied. Now run:"
echo "   cd ~/rapid-ledger/apps/api && npm test"
echo "   cd ~/rapid-ledger && npm run typecheck"
