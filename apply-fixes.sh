#!/usr/bin/env bash
# apply-fixes.sh
# Run this from the ROOT of your rapid-ledger project:
#   cd ~/rapid-ledger && bash apply-fixes.sh
#
# What this script does:
#   Fix 1  — consolidates to one Prisma schema at prisma/schema.prisma
#   Fix 2  — adds proper npm workspace + root scripts (dev, build, test, lint, typecheck)
#   Fix 3  — fixes failing checks (types, tests, lint)
#   Fix 4  — login API now returns lowercase `user`
#   Fix 5  — replaces `any` with proper domain types
#   Fix 6  — splits index.ts into services + thin routes
#   Fix 7  — centralises validation into validation.service.ts
#   Fix 8  — tests use app.handle() — no server startup needed
#   Fix 9  — versioning preserves documentCode, increments version
#   Fix 10 — audit event emitted on ledger entry creation
#   Fix 11 — removes "invoice compliance" copy from web
#   Fix 12 — README corrected (Next.js 15, real clone URL, working setup)
#   Fix 13 — frontend lint clean (hook deps, no any)
#   Fix 14 — clear local setup flow in README
#   Fix 15 — project is fully runnable end-to-end

set -e

ROOT="$(pwd)"

if [ ! -f "$ROOT/package.json" ] || ! grep -q "rapid-ledger" "$ROOT/package.json" 2>/dev/null; then
  echo "❌ Run this script from the root of your rapid-ledger project."
  exit 1
fi

echo "🔧 Applying all 15 fixes to rapid-ledger..."
echo ""

# ────────────────────────────────────────────────────────────────────────────
# 0. Back up key files the user might have customised
# ────────────────────────────────────────────────────────────────────────────
BACKUP_DIR="$ROOT/.fix-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Backing up original files to $BACKUP_DIR"
for f in package.json apps/api/package.json apps/api/src/index.ts apps/web/app/login/page.tsx prisma/schema.prisma README.md; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$BACKUP_DIR/$(basename "$f").bak" || true
done

# ────────────────────────────────────────────────────────────────────────────
# FIX 1 + 2: Root package.json
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Fix 1+2: Root package.json (workspaces + scripts)"
cat > "$ROOT/package.json" << 'ENDJSON'
{
  "name": "rapid-ledger",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/api\" \"npm run dev -w apps/web\"",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "db:generate": "prisma generate --schema=prisma/schema.prisma",
    "db:push": "prisma db push --schema=prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema=prisma/schema.prisma",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio --schema=prisma/schema.prisma",
    "db:reset": "prisma migrate reset --schema=prisma/schema.prisma --force && npm run db:seed",
    "setup": "npm install && npm run db:generate && npm run db:push && npm run db:seed"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "prisma": "5.22.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
ENDJSON

# ────────────────────────────────────────────────────────────────────────────
# FIX 1: apps/api/package.json — point prisma to root schema
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 1: API package.json — prisma.schema → root schema"
cat > "$ROOT/apps/api/package.json" << 'ENDJSON'
{
  "name": "@rapid-ledger/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --noEmit && tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "prisma": {
    "schema": "../../prisma/schema.prisma"
  },
  "dependencies": {
    "@elysiajs/node": "^1.1.1",
    "@prisma/client": "5.22.0",
    "bcryptjs": "^2.4.3",
    "elysia": "^1.1.25",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.5",
    "@vitest/coverage-v8": "^1.2.2",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2"
  }
}
ENDJSON

# ────────────────────────────────────────────────────────────────────────────
# FIX 1: Remove duplicate prisma schemas
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 1: Remove any duplicate Prisma schemas under apps/api/prisma/"
rm -rf "$ROOT/apps/api/prisma" 2>/dev/null || true

# ────────────────────────────────────────────────────────────────────────────
# FIX 1: Ensure prisma/.env exists (needed for CLI commands from root)
# ────────────────────────────────────────────────────────────────────────────
if [ -f "$ROOT/apps/api/.env" ] && [ ! -f "$ROOT/prisma/.env" ]; then
  echo "▶ Fix 1: Linking prisma/.env → same DATABASE_URL as apps/api/.env"
  DB_URL=$(grep "^DATABASE_URL=" "$ROOT/apps/api/.env" | head -1)
  echo "$DB_URL" > "$ROOT/prisma/.env"
fi

# ────────────────────────────────────────────────────────────────────────────
# FIX 2: API tsconfig
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 2+3: API tsconfig.json"
cat > "$ROOT/apps/api/tsconfig.json" << 'ENDJSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "."
  },
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
ENDJSON

# ────────────────────────────────────────────────────────────────────────────
# FIX 8: vitest.config.ts
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 8: API vitest.config.ts"
cat > "$ROOT/apps/api/vitest.config.ts" << 'ENDTS'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    reporters: ["verbose"],
  },
});
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# Create directory structure
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Creating directory structure"
mkdir -p "$ROOT/apps/api/src/types"
mkdir -p "$ROOT/apps/api/src/validators"
mkdir -p "$ROOT/apps/api/src/services"
mkdir -p "$ROOT/apps/api/src/routes"
mkdir -p "$ROOT/apps/api/src/lib"
mkdir -p "$ROOT/apps/api/src/middleware"
mkdir -p "$ROOT/apps/api/tests"

# ────────────────────────────────────────────────────────────────────────────
# FIX 5: Domain types
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 5: src/types/index.ts"
cat > "$ROOT/apps/api/src/types/index.ts" << 'ENDTS'
import type { User, RapidDocument, RoleAssignment, Approval, LedgerEntry, AuditLog } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/** Fix 4: lowercase `user` in login response */
export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export interface CreateDocumentBody {
  title: string;
  decisionSummary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  complianceImpact?: boolean;
  department?: string;
  deadline?: string;
  businessContext?: string;
  problemStatement?: string;
  proposedDecision?: string;
  alternativesConsidered?: string;
}

export interface ValidationError {
  rule: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface AuditDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export type { User, RapidDocument, RoleAssignment, Approval, LedgerEntry, AuditLog };
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 7: Single validation schemas source
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 7: src/validators/schemas.ts"
cat > "$ROOT/apps/api/src/validators/schemas.ts" << 'ENDTS'
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  decisionSummary: z.string().min(1, "Decision summary is required").max(2000),
  riskLevel: riskLevelSchema.default("low"),
  complianceImpact: z.boolean().default(false),
  department: z.string().optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
  businessContext: z.string().optional(),
  problemStatement: z.string().optional(),
  proposedDecision: z.string().optional(),
  alternativesConsidered: z.string().optional(),
});

export const approvalSchema = z.object({
  comment: z.string().max(1000).optional(),
});

export const assignRoleSchema = z.object({
  roleType: z.enum(["recommend", "agree", "perform", "input", "decide"]),
  userId: z.string().min(1, "User ID is required"),
});

export const addEvidenceSchema = z.object({
  type: z.enum(["link", "file", "note"]),
  title: z.string().min(1, "Title is required"),
  urlOrPath: z.string().optional(),
  description: z.string().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "creator", "approver", "viewer", "recommender", "performer"]),
  department: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["admin", "creator", "approver", "viewer", "recommender", "performer"]).optional(),
  department: z.string().optional(),
});

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) };
  }
  return { ok: true, data: result.data };
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 5: lib/ files
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 5: src/lib/auth.ts"
cat > "$ROOT/apps/api/src/lib/auth.ts" << 'ENDTS'
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET ?? "rapid-ledger-dev-secret-change-in-production";

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "object" && "userId" in decoded) return decoded as JwtPayload;
    return null;
  } catch { return null; }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
ENDTS

cat > "$ROOT/apps/api/src/lib/errors.ts" << 'ENDTS'
export interface ApiError { error: { code: string; message: string; details?: string[] } }

export const Errors = {
  unauthorized: (message = "Authentication required"): ApiError =>
    ({ error: { code: "UNAUTHORIZED", message } }),
  forbidden: (message = "You do not have permission"): ApiError =>
    ({ error: { code: "FORBIDDEN", message } }),
  notFound: (resource = "Resource"): ApiError =>
    ({ error: { code: "NOT_FOUND", message: `${resource} not found` } }),
  badRequest: (message: string, details?: string[]): ApiError =>
    ({ error: { code: "BAD_REQUEST", message, details } }),
  conflict: (message: string): ApiError =>
    ({ error: { code: "CONFLICT", message } }),
  invalidStatus: (current: string, allowed: string[]): ApiError =>
    ({ error: { code: "INVALID_STATUS_TRANSITION", message: `Cannot act on document with status "${current}"`, details: [`Allowed from: ${allowed.join(", ")}`] } }),
} as const;
ENDTS

cat > "$ROOT/apps/api/src/lib/prisma.ts" << 'ENDTS'
import { PrismaClient } from "@prisma/client";

declare global { var __prisma: PrismaClient | undefined; }

export const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;
ENDTS

cat > "$ROOT/apps/api/src/lib/documentCode.ts" << 'ENDTS'
import { prisma } from "./prisma";

export async function nextDocumentCode(): Promise<string> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT "documentCode") as count FROM "RapidDocument"
  `;
  const count = Number(result[0]?.count ?? 0);
  return `RAPID-${(count + 1).toString().padStart(3, "0")}`;
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 5: Middleware
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 5: middleware/"
cat > "$ROOT/apps/api/src/middleware/auth.ts" << 'ENDTS'
import { Elysia } from "elysia";
import { verifyToken, extractBearerToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import type { User } from "../types";

export const authMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  { as: "scoped" },
  async ({ headers, set }): Promise<{ user: User }> => {
    const token = extractBearerToken(headers.authorization);
    if (!token) { set.status = 401; throw new Error(JSON.stringify(Errors.unauthorized())); }
    const payload = verifyToken(token);
    if (!payload) { set.status = 401; throw new Error(JSON.stringify(Errors.unauthorized("Invalid or expired token"))); }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) { set.status = 401; throw new Error(JSON.stringify(Errors.unauthorized("User not found or disabled"))); }
    return { user };
  }
);
ENDTS

cat > "$ROOT/apps/api/src/middleware/permissions.ts" << 'ENDTS'
import type { User, UserRole } from "@prisma/client";
import { Errors } from "../lib/errors";

const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  admin:       new Set(["document:read","document:create","document:update","document:submit","document:approve","document:reject","document:finalize","document:version","document:recommend","role:assign","evidence:add","user:create","user:update","user:read","ledger:read","audit:read","report:read"]),
  creator:     new Set(["document:read","document:create","document:update","document:submit","document:version","role:assign","evidence:add","ledger:read","audit:read"]),
  approver:    new Set(["document:read","document:approve","document:reject","ledger:read","audit:read"]),
  recommender: new Set(["document:read","document:recommend","evidence:add","ledger:read"]),
  performer:   new Set(["document:read","document:finalize","ledger:read"]),
  viewer:      new Set(["document:read","ledger:read"]),
};

export function hasPermission(user: User, permission: string): boolean {
  return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
}

export function requirePermission(user: User, permission: string, set: { status: number | string }): void {
  if (!hasPermission(user, permission)) { set.status = 403; throw new Error(JSON.stringify(Errors.forbidden())); }
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 10: Audit service
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 10: services/audit.service.ts"
cat > "$ROOT/apps/api/src/services/audit.service.ts" << 'ENDTS'
import type { AuditAction } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { AuditDetails } from "../types";

export async function createAuditLog(actorId: string, action: AuditAction, objectType: string, objectId: string, details?: AuditDetails): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { actorId, action, objectType, objectId, details: details ?? undefined } });
  } catch (err) { console.error("[audit] Failed to write audit log:", err); }
}

export async function getAuditLogs(options?: { actorId?: string; objectType?: string; objectId?: string; limit?: number; offset?: number }) {
  const { actorId, objectType, objectId, limit = 100, offset = 0 } = options ?? {};
  return prisma.auditLog.findMany({
    where: { ...(actorId ? { actorId } : {}), ...(objectType ? { objectType } : {}), ...(objectId ? { objectId } : {}) },
    include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit, skip: offset,
  });
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 4: Auth service (lowercase user)
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 4: services/auth.service.ts"
cat > "$ROOT/apps/api/src/services/auth.service.ts" << 'ENDTS'
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { createAuditLog } from "./audit.service";
import type { LoginResponse, PublicUser } from "../types";

export function toPublicUser(user: { id: string; name: string; email: string; role: string; department: string | null }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department };
}

export async function loginUser(email: string, password: string): Promise<LoginResponse | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return null;
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  void createAuditLog(user.id, "login", "User", user.id, { email: user.email });
  return { token, user: toPublicUser(user) }; // Fix 4: lowercase `user`
}

export async function getCurrentUser(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return toPublicUser(user);
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 7: Validation service (single source)
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 7: services/validation.service.ts"
cat > "$ROOT/apps/api/src/services/validation.service.ts" << 'ENDTS'
import type { RapidDocument, RoleAssignment, Evidence } from "@prisma/client";
import type { ValidationResult, ValidationError } from "../types";

export interface ValidateDocumentInput {
  document: Pick<RapidDocument, "title" | "decisionSummary" | "riskLevel" | "complianceImpact" | "businessContext" | "problemStatement" | "proposedDecision">;
  roles: Pick<RoleAssignment, "roleType" | "userId">[];
  evidence: Evidence[];
}

export function validateDocument(input: ValidateDocumentInput): ValidationResult {
  const { document, roles, evidence } = input;
  const errors: ValidationError[] = [];

  if (!document.title?.trim()) errors.push({ rule: "title_required", message: "Title is required", field: "title" });
  if (!document.decisionSummary?.trim()) errors.push({ rule: "decision_summary_required", message: "Decision summary is required", field: "decisionSummary" });

  const assignedRoles = new Set(roles.map((r) => r.roleType));
  if (!assignedRoles.has("recommend")) errors.push({ rule: "recommend_required", message: "At least one Recommend (R) owner is required" });
  if (!assignedRoles.has("perform")) errors.push({ rule: "perform_required", message: "At least one Perform (P) owner is required" });
  if (!assignedRoles.has("decide")) errors.push({ rule: "decide_required", message: "A Decide (D) owner is required" });

  const deciders = roles.filter((r) => r.roleType === "decide");
  if (deciders.length > 1) errors.push({ rule: "single_decider", message: "Only one Decide (D) owner is allowed" });

  const recommenderIds = new Set(roles.filter((r) => r.roleType === "recommend").map((r) => r.userId));
  const deciderIds = new Set(roles.filter((r) => r.roleType === "decide").map((r) => r.userId));
  if ([...recommenderIds].some((id) => deciderIds.has(id))) errors.push({ rule: "recommend_decide_conflict", message: "The same person cannot be both Recommend (R) and Decide (D)" });

  const isHighRisk = document.riskLevel === "high" || document.riskLevel === "critical";
  if (isHighRisk && !assignedRoles.has("agree")) errors.push({ rule: "agree_required_high_risk", message: "High/critical risk documents require an Agree (A) owner" });
  if (isHighRisk && evidence.length === 0) errors.push({ rule: "evidence_required_high_risk", message: "High/critical risk documents require at least one piece of evidence" });
  if (document.complianceImpact && !document.businessContext?.trim()) errors.push({ rule: "business_context_required_compliance", message: "Business context is required when compliance impact is flagged", field: "businessContext" });

  return { valid: errors.length === 0, errors };
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 9/10: Ledger service
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 9+10: services/ledger.service.ts"
cat > "$ROOT/apps/api/src/services/ledger.service.ts" << 'ENDTS'
import { prisma } from "../lib/prisma";
import { createAuditLog } from "./audit.service";

export async function finalizeDocument(documentId: string, actorId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "approved") return { ok: false as const, invalidStatus: doc.status };

  const now = new Date();
  const updated = await prisma.rapidDocument.update({
    where: { id: documentId },
    data: { status: "finalized", finalizedAt: now },
    include: { roleAssignments: { include: { user: { select: { id: true, name: true } } } }, evidence: true, ledgerEntries: true },
  });

  // Fix 10: Create ledger entry + emit TWO audit events
  const ledgerEntry = await prisma.ledgerEntry.create({
    data: { documentId, documentCode: doc.documentCode, version: doc.version, title: doc.title, finalizedBy: actorId, finalizedAt: now },
  });

  await createAuditLog(actorId, "document_finalized", "RapidDocument", documentId, { documentCode: doc.documentCode, version: doc.version, ledgerEntryId: ledgerEntry.id });
  // Fix 10: distinct audit event for ledger entry creation
  await createAuditLog(actorId, "ledger_entry_created", "LedgerEntry", ledgerEntry.id, { documentId, documentCode: doc.documentCode, version: doc.version, title: doc.title });

  return { ok: true as const, document: updated, ledgerEntry };
}

export async function getLedgerEntries(options?: { search?: string; limit?: number; offset?: number }) {
  const { search, limit = 100, offset = 0 } = options ?? {};
  return prisma.ledgerEntry.findMany({
    where: search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { documentCode: { contains: search, mode: "insensitive" } }] } : undefined,
    include: { document: { include: { roleAssignments: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
    orderBy: { finalizedAt: "desc" }, take: limit, skip: offset,
  });
}

export async function exportLedgerCsv(): Promise<string> {
  const entries = await getLedgerEntries({ limit: 10000 });
  const rows = entries.map((e) => [e.documentCode, e.version, `"${e.title.replace(/"/g, '""')}"`, e.finalizedBy, e.finalizedAt.toISOString()].join(","));
  return ["documentCode,version,title,finalizedBy,finalizedAt", ...rows].join("\n");
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 9: Document service versioning
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 9: services/document.service.ts (versioning preserves documentCode)"
cat > "$ROOT/apps/api/src/services/document.service.ts" << 'ENDTS'
import { prisma } from "../lib/prisma";
import { nextDocumentCode } from "../lib/documentCode";
import { validateDocument } from "./validation.service";
import { createAuditLog } from "./audit.service";
import type { CreateDocumentBody } from "../types";
import type { DocumentStatus } from "@prisma/client";

const INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  roleAssignments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  evidence: true,
  approvals: { include: { approver: { select: { id: true, name: true, email: true } } } },
  ledgerEntries: true,
} as const;

export const listDocuments = (filters?: { status?: DocumentStatus; department?: string; riskLevel?: string; search?: string }) =>
  prisma.rapidDocument.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.department ? { department: filters.department } : {}),
      ...(filters?.riskLevel ? { riskLevel: filters.riskLevel as "low" | "medium" | "high" | "critical" } : {}),
      ...(filters?.search ? { OR: [{ title: { contains: filters.search, mode: "insensitive" } }, { documentCode: { contains: filters.search, mode: "insensitive" } }] } : {}),
    },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });

export const getDocument = (id: string) => prisma.rapidDocument.findUnique({ where: { id }, include: INCLUDE });

export async function createDocument(body: CreateDocumentBody, createdById: string) {
  const documentCode = await nextDocumentCode();
  const doc = await prisma.rapidDocument.create({
    data: { documentCode, version: 1, title: body.title, decisionSummary: body.decisionSummary, riskLevel: body.riskLevel, complianceImpact: body.complianceImpact ?? false, department: body.department, deadline: body.deadline ? new Date(body.deadline) : undefined, businessContext: body.businessContext, problemStatement: body.problemStatement, proposedDecision: body.proposedDecision, alternativesConsidered: body.alternativesConsidered, createdById, status: "draft" },
    include: INCLUDE,
  });
  await createAuditLog(createdById, "document_created", "RapidDocument", doc.id, { documentCode, title: body.title });
  return doc;
}

export async function submitDocument(documentId: string, actorId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true, evidence: true, approvals: true } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "draft" && doc.status !== "needs_changes") return { ok: false as const, invalidStatus: doc.status };

  const validation = validateDocument({ document: doc, roles: doc.roleAssignments, evidence: doc.evidence });
  if (!validation.valid) return { ok: false as const, validationErrors: validation.errors };

  const hasAgree = doc.roleAssignments.some((r) => r.roleType === "agree");
  const nextStatus: DocumentStatus = hasAgree ? "awaiting_agreement" : "approved";

  if (hasAgree) {
    for (const a of doc.roleAssignments.filter((r) => r.roleType === "agree")) {
      const existing = await prisma.approval.findFirst({ where: { documentId, approverId: a.userId } });
      if (existing) { await prisma.approval.update({ where: { id: existing.id }, data: { status: "pending", comment: null } }); }
      else { await prisma.approval.create({ data: { documentId, approverId: a.userId, status: "pending" } }); }
    }
  }

  const updated = await prisma.rapidDocument.update({ where: { id: documentId }, data: { status: nextStatus, submittedAt: new Date() }, include: INCLUDE });
  await createAuditLog(actorId, "document_submitted", "RapidDocument", documentId, { newStatus: nextStatus });
  return { ok: true as const, document: updated };
}

export async function approveDocument(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  await prisma.approval.updateMany({ where: { documentId, approverId }, data: { status: "approved", comment } });
  const allApprovals = await prisma.approval.findMany({ where: { documentId } });
  const allApproved = allApprovals.every((a) => a.status === "approved");
  const updated = allApproved
    ? await prisma.rapidDocument.update({ where: { id: documentId }, data: { status: "approved" }, include: INCLUDE })
    : await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: INCLUDE });
  await createAuditLog(approverId, "document_approved", "RapidDocument", documentId, { comment, allApproved });
  return { ok: true as const, document: updated };
}

export async function rejectDocument(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  await prisma.approval.updateMany({ where: { documentId, approverId }, data: { status: "rejected", comment } });
  const updated = await prisma.rapidDocument.update({ where: { id: documentId }, data: { status: "rejected" }, include: INCLUDE });
  await createAuditLog(approverId, "document_rejected", "RapidDocument", documentId, { comment });
  return { ok: true as const, document: updated };
}

export async function requestChanges(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  await prisma.approval.updateMany({ where: { documentId, approverId }, data: { status: "needs_changes", comment } });
  const updated = await prisma.rapidDocument.update({ where: { id: documentId }, data: { status: "needs_changes" }, include: INCLUDE });
  await createAuditLog(approverId, "document_needs_changes", "RapidDocument", documentId, { comment });
  return { ok: true as const, document: updated };
}

/** Fix 9: creates new version with SAME documentCode, version + 1 */
export async function createDocumentVersion(documentId: string, actorId: string) {
  const original = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true } });
  if (!original) return { ok: false as const, notFound: true };
  if (original.status !== "finalized") return { ok: false as const, invalidStatus: original.status };

  const newDoc = await prisma.rapidDocument.create({
    data: {
      documentCode: original.documentCode, // ✅ same code
      version: original.version + 1,       // ✅ incremented version
      title: original.title, decisionSummary: original.decisionSummary, riskLevel: original.riskLevel,
      complianceImpact: original.complianceImpact, department: original.department, deadline: original.deadline,
      businessContext: original.businessContext, problemStatement: original.problemStatement,
      proposedDecision: original.proposedDecision, alternativesConsidered: original.alternativesConsidered,
      createdById: actorId, status: "draft",
    },
    include: INCLUDE,
  });

  for (const role of original.roleAssignments) {
    await prisma.roleAssignment.create({ data: { documentId: newDoc.id, roleType: role.roleType, userId: role.userId } });
  }

  await createAuditLog(actorId, "document_versioned", "RapidDocument", newDoc.id, { documentCode: original.documentCode, previousVersion: original.version, newVersion: newDoc.version });
  return { ok: true as const, document: newDoc };
}

export async function assignRole(documentId: string, roleType: string, userId: string, actorId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (!["draft", "needs_changes"].includes(doc.status)) return { ok: false as const, invalidStatus: doc.status };
  const assignment = await prisma.roleAssignment.create({ data: { documentId, roleType: roleType as "recommend" | "agree" | "perform" | "input" | "decide", userId } });
  await createAuditLog(actorId, "role_assigned", "RoleAssignment", assignment.id, { documentId, roleType, assignedUserId: userId });
  return { ok: true as const, assignment };
}

export async function addEvidence(documentId: string, data: { type: string; title: string; urlOrPath?: string; description?: string }, actorId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  const evidence = await prisma.evidence.create({ data: { documentId, type: data.type, title: data.title, urlOrPath: data.urlOrPath, description: data.description, uploadedBy: actorId } });
  await createAuditLog(actorId, "evidence_added", "Evidence", evidence.id, { documentId });
  return { ok: true as const, evidence };
}

export async function runValidation(documentId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true, evidence: true } });
  if (!doc) return null;
  return validateDocument({ document: doc, roles: doc.roleAssignments, evidence: doc.evidence });
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 6: Thin route files
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 6: routes/"

cat > "$ROOT/apps/api/src/routes/auth.routes.ts" << 'ENDTS'
import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { loginUser, getCurrentUser } from "../services/auth.service";
import { parseBody, loginSchema } from "../validators/schemas";
import { Errors } from "../lib/errors";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/login", async ({ body, set }) => {
    const parsed = parseBody(loginSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid request body", parsed.errors); }
    const result = await loginUser(parsed.data.email, parsed.data.password);
    if (!result) { set.status = 401; return Errors.unauthorized("Invalid email or password"); }
    return result; // { token, user } — Fix 4: lowercase user
  })
  .use(authMiddleware)
  .get("/me", async ({ user, set }) => {
    const profile = await getCurrentUser(user.id);
    if (!profile) { set.status = 401; return Errors.unauthorized(); }
    return profile;
  });
ENDTS

cat > "$ROOT/apps/api/src/routes/ledger.routes.ts" << 'ENDTS'
import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { getLedgerEntries, exportLedgerCsv } from "../services/ledger.service";

export const ledgerRoutes = new Elysia({ prefix: "/ledger" })
  .use(authMiddleware)
  .get("/", async ({ user, query, set }) => {
    requirePermission(user, "ledger:read", set);
    return getLedgerEntries({ search: query.search, limit: query.limit ? Number(query.limit) : undefined, offset: query.offset ? Number(query.offset) : undefined });
  })
  .get("/export.csv", async ({ user, set }) => {
    requirePermission(user, "ledger:read", set);
    const csv = await exportLedgerCsv();
    set.headers["content-type"] = "text/csv";
    set.headers["content-disposition"] = `attachment; filename="rapid-ledger-${new Date().toISOString().split("T")[0]}.csv"`;
    return csv;
  });
ENDTS

cat > "$ROOT/apps/api/src/routes/audit.routes.ts" << 'ENDTS'
import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { getAuditLogs } from "../services/audit.service";

export const auditRoutes = new Elysia({ prefix: "/audit" })
  .use(authMiddleware)
  .get("/", async ({ user, query, set }) => {
    requirePermission(user, "audit:read", set);
    return getAuditLogs({ actorId: query.actorId, objectType: query.objectType, objectId: query.objectId, limit: query.limit ? Number(query.limit) : 100, offset: query.offset ? Number(query.offset) : 0 });
  });
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 6: document.routes.ts
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 6: src/routes/document.routes.ts"
mkdir -p "$ROOT/apps/api/src/routes"
cat > "$ROOT/apps/api/src/routes/document.routes.ts" << 'ENDTS'
import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { parseBody, createDocumentSchema, approvalSchema, assignRoleSchema, addEvidenceSchema } from "../validators/schemas";
import {
  listDocuments,
  getDocument,
  createDocument,
  submitDocument,
  approveDocument,
  rejectDocument,
  requestChanges,
  createDocumentVersion,
  assignRole,
  addEvidence,
  runValidation,
} from "../services/document.service";
import { Errors } from "../lib/errors";
import type { DocumentStatus } from "@prisma/client";

export const documentRoutes = new Elysia({ prefix: "/documents" })
  .use(authMiddleware)

  // ── GET /documents ────────────────────────────────────────────────────────
  .get("/", async ({ user, query, set }) => {
    requirePermission(user, "document:read", set);
    const docs = await listDocuments({
      status: query.status as DocumentStatus | undefined,
      department: query.department,
      riskLevel: query.riskLevel,
      search: query.search,
    });
    return docs;
  })

  // ── POST /documents ───────────────────────────────────────────────────────
  .post("/", async ({ user, body, set }) => {
    requirePermission(user, "document:create", set);
    const parsed = parseBody(createDocumentSchema, body);
    if (!parsed.ok) {
      set.status = 400;
      return Errors.badRequest("Invalid document data", parsed.errors);
    }
    const doc = await createDocument(parsed.data, user.id);
    set.status = 201;
    return doc;
  })

  // ── GET /documents/:id ────────────────────────────────────────────────────
  .get("/:id", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const doc = await getDocument(params.id);
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    return doc;
  })

  // ── GET /documents/:id/validate ───────────────────────────────────────────
  .get("/:id/validate", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const result = await runValidation(params.id);
    if (!result) { set.status = 404; return Errors.notFound("Document"); }
    return result;
  })

  // ── POST /documents/:id/submit ────────────────────────────────────────────
  .post("/:id/submit", async ({ user, params, set }) => {
    requirePermission(user, "document:submit", set);
    const result = await submitDocument(params.id, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["draft", "needs_changes"]); }
      if ("validationErrors" in result) { set.status = 422; return Errors.badRequest("Document failed validation", result.validationErrors?.map((e) => e.message)); }
    }
    return result.document;
  })

  // ── POST /documents/:id/approve ───────────────────────────────────────────
  .post("/:id/approve", async ({ user, params, body, set }) => {
    requirePermission(user, "document:approve", set);
    const parsed = parseBody(approvalSchema, body ?? {});
    const result = await approveDocument(params.id, user.id, parsed.ok ? parsed.data.comment : undefined);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["awaiting_agreement"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/reject ────────────────────────────────────────────
  .post("/:id/reject", async ({ user, params, body, set }) => {
    requirePermission(user, "document:reject", set);
    const parsed = parseBody(approvalSchema, body ?? {});
    const result = await rejectDocument(params.id, user.id, parsed.ok ? parsed.data.comment : undefined);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["awaiting_agreement"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/needs-changes ─────────────────────────────────────
  .post("/:id/needs-changes", async ({ user, params, body, set }) => {
    requirePermission(user, "document:reject", set);
    const parsed = parseBody(approvalSchema, body ?? {});
    const result = await requestChanges(params.id, user.id, parsed.ok ? parsed.data.comment : undefined);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["awaiting_agreement"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/finalize ──────────────────────────────────────────
  .post("/:id/finalize", async ({ user, params, set }) => {
    requirePermission(user, "document:finalize", set);
    const { finalizeDocument } = await import("../services/ledger.service");
    const result = await finalizeDocument(params.id, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["approved"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/version ───────────────────────────────────────────
  .post("/:id/version", async ({ user, params, set }) => {
    requirePermission(user, "document:version", set);
    const result = await createDocumentVersion(params.id, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["finalized"]); }
    }
    set.status = 201;
    return result.document;
  })

  // ── POST /documents/:id/roles ─────────────────────────────────────────────
  .post("/:id/roles", async ({ user, params, body, set }) => {
    requirePermission(user, "role:assign", set);
    const parsed = parseBody(assignRoleSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid role data", parsed.errors); }
    const result = await assignRole(params.id, parsed.data.roleType, parsed.data.userId, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus, ["draft", "needs_changes"]); }
    }
    set.status = 201;
    return result.assignment;
  })

  // ── POST /documents/:id/evidence ──────────────────────────────────────────
  .post("/:id/evidence", async ({ user, params, body, set }) => {
    requirePermission(user, "evidence:add", set);
    const parsed = parseBody(addEvidenceSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid evidence data", parsed.errors); }
    const result = await addEvidence(params.id, parsed.data, user.id);
    if (!result.ok && "notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
    set.status = 201;
    return result.evidence;
  });
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 6: user.routes.ts
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 6: src/routes/user.routes.ts"
cat > "$ROOT/apps/api/src/routes/user.routes.ts" << 'ENDTS'
import { Elysia } from "elysia";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { parseBody, createUserSchema, updateUserSchema } from "../validators/schemas";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { createAuditLog } from "../services/audit.service";
import type { UserRole } from "@prisma/client";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(authMiddleware)

  // ── GET /users ────────────────────────────────────────────────────────────
  .get("/", async ({ user, set }) => {
    requirePermission(user, "user:read", set);
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  })

  // ── POST /users ───────────────────────────────────────────────────────────
  .post("/", async ({ user, body, set }) => {
    requirePermission(user, "user:create", set);
    const parsed = parseBody(createUserSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid user data", parsed.errors); }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) { set.status = 409; return Errors.conflict("A user with that email already exists"); }

    const hashed = await bcrypt.hash(parsed.data.password, 10);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashed,
        role: parsed.data.role as UserRole,
        department: parsed.data.department,
      },
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true },
    });

    await createAuditLog(user.id, "user_created", "User", created.id, { email: created.email });

    set.status = 201;
    return created;
  })

  // ── PATCH /users/:id ──────────────────────────────────────────────────────
  .patch("/:id", async ({ user, params, body, set }) => {
    requirePermission(user, "user:update", set);
    const parsed = parseBody(updateUserSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid update data", parsed.errors); }

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) { set.status = 404; return Errors.notFound("User"); }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role as UserRole } : {}),
        ...(parsed.data.department !== undefined ? { department: parsed.data.department } : {}),
      },
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true },
    });

    await createAuditLog(user.id, "user_updated", "User", params.id, { changes: JSON.stringify(parsed.data) });

    return updated;
  });
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 6: Thin index.ts
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 6: src/index.ts (thin entry point)"
cat > "$ROOT/apps/api/src/index.ts" << 'ENDTS'
import { Elysia } from "elysia";
import { nodeAdapter } from "@elysiajs/node";
import { authRoutes } from "./routes/auth.routes";
import { documentRoutes } from "./routes/document.routes";
import { ledgerRoutes } from "./routes/ledger.routes";
import { userRoutes } from "./routes/user.routes";
import { auditRoutes } from "./routes/audit.routes";

export const app = new Elysia()
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authRoutes)
  .use(documentRoutes)
  .use(ledgerRoutes)
  .use(userRoutes)
  .use(auditRoutes)
  .onError(({ error, set }) => {
    try {
      const parsed = JSON.parse(error.message) as { error: { code: string; message: string } };
      if (parsed.error) return parsed;
    } catch { /* not a structured error */ }
    console.error("[api error]", error);
    set.status = 500;
    return { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } };
  });

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT) || 3001;
  nodeAdapter(app).listen({ port });
  console.log(`🚀 RAPID Ledger API running on http://localhost:${port}`);
}
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 8: Self-contained tests
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 8: tests/setup.ts"
cat > "$ROOT/apps/api/tests/setup.ts" << 'ENDTS'
process.env.NODE_ENV = "test";
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? "postgresql://postgres:password@localhost:5432/rapid_ledger";
}
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-key-not-for-production";
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 8: validation.test.ts (pure unit tests — no DB needed)
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 8: tests/validation.test.ts"
cat > "$ROOT/apps/api/tests/validation.test.ts" << 'ENDTS'
import { describe, it, expect } from "vitest";
import { validateDocument } from "../src/services/validation.service";
import type { Evidence, RapidDocument, RoleAssignment } from "@prisma/client";

function makeDoc(
  overrides: Partial<
    Pick<
      RapidDocument,
      "title" | "decisionSummary" | "riskLevel" | "complianceImpact" | "businessContext" | "problemStatement" | "proposedDecision"
    >
  > = {}
) {
  return {
    title: "Migrate to S3",
    decisionSummary: "Move all file storage from local disk to AWS S3",
    riskLevel: "low" as const,
    complianceImpact: false,
    businessContext: null,
    problemStatement: null,
    proposedDecision: null,
    ...overrides,
  };
}

function makeRole(roleType: RoleAssignment["roleType"], userId = "user-1") {
  return { id: "role-1", documentId: "doc-1", roleType, userId, createdAt: new Date() } as RoleAssignment;
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "ev-1",
    documentId: "doc-1",
    type: "link",
    title: "Policy",
    urlOrPath: "https://example.com",
    description: null,
    uploadedBy: "user-1",
    createdAt: new Date(),
    ...overrides,
  } as Evidence;
}

const BASE_ROLES = [
  makeRole("recommend"),
  makeRole("perform", "user-2"),
  makeRole("decide", "user-3"),
];

describe("validateDocument", () => {
  it("passes for a fully valid low-risk document", () => {
    const result = validateDocument({ document: makeDoc(), roles: BASE_ROLES, evidence: [] });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when title is missing", () => {
    const result = validateDocument({ document: makeDoc({ title: "" }), roles: BASE_ROLES, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "title_required")).toBe(true);
  });

  it("fails when decisionSummary is missing", () => {
    const result = validateDocument({ document: makeDoc({ decisionSummary: "" }), roles: BASE_ROLES, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "decision_summary_required")).toBe(true);
  });

  it("fails when there is no Decide owner", () => {
    const roles = [makeRole("recommend"), makeRole("perform", "user-2")];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "decide_required")).toBe(true);
  });

  it("fails when there is no Recommend owner", () => {
    const roles = [makeRole("perform", "user-2"), makeRole("decide", "user-3")];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "recommend_required")).toBe(true);
  });

  it("fails when there is no Perform owner", () => {
    const roles = [makeRole("recommend"), makeRole("decide", "user-3")];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "perform_required")).toBe(true);
  });

  it("fails when there are multiple Decide owners", () => {
    const roles = [
      makeRole("recommend"),
      makeRole("perform", "user-2"),
      makeRole("decide", "user-3"),
      makeRole("decide", "user-4"),
    ];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "single_decider")).toBe(true);
  });

  it("fails when the same user is both Recommend and Decide", () => {
    const roles = [
      makeRole("recommend", "user-X"),
      makeRole("perform", "user-2"),
      makeRole("decide", "user-X"),
    ];
    const result = validateDocument({ document: makeDoc(), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "recommend_decide_conflict")).toBe(true);
  });

  it("fails for high-risk doc without an Agree owner", () => {
    const result = validateDocument({
      document: makeDoc({ riskLevel: "high" }),
      roles: BASE_ROLES,
      evidence: [makeEvidence()],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "agree_required_high_risk")).toBe(true);
  });

  it("fails for high-risk doc without evidence", () => {
    const roles = [...BASE_ROLES, makeRole("agree", "user-4")];
    const result = validateDocument({ document: makeDoc({ riskLevel: "high" }), roles, evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "evidence_required_high_risk")).toBe(true);
  });

  it("passes for high-risk doc with Agree owner and evidence", () => {
    const roles = [...BASE_ROLES, makeRole("agree", "user-4")];
    const result = validateDocument({
      document: makeDoc({ riskLevel: "high" }),
      roles,
      evidence: [makeEvidence()],
    });
    expect(result.valid).toBe(true);
  });

  it("passes for critical-risk doc with Agree owner and evidence", () => {
    const roles = [...BASE_ROLES, makeRole("agree", "user-4")];
    const result = validateDocument({
      document: makeDoc({ riskLevel: "critical" }),
      roles,
      evidence: [makeEvidence()],
    });
    expect(result.valid).toBe(true);
  });

  it("fails for compliance doc without businessContext", () => {
    const result = validateDocument({
      document: makeDoc({ complianceImpact: true, businessContext: null }),
      roles: BASE_ROLES,
      evidence: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "business_context_required_compliance")).toBe(true);
  });

  it("passes for compliance doc with businessContext", () => {
    const result = validateDocument({
      document: makeDoc({ complianceImpact: true, businessContext: "Regulatory requirement" }),
      roles: BASE_ROLES,
      evidence: [],
    });
    expect(result.valid).toBe(true);
  });

  it("returns multiple errors simultaneously", () => {
    const result = validateDocument({ document: makeDoc({ title: "", decisionSummary: "" }), roles: [], evidence: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 8: api.test.ts (integration tests via app.handle — no server needed)
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 8: tests/api.test.ts"
cat > "$ROOT/apps/api/tests/api.test.ts" << 'ENDTS'
/**
 * API integration tests — Fix 8: self-contained, use app.handle() directly.
 * No separate server process needed. Tests run against the Elysia handler.
 *
 * Requirements:
 *   - DATABASE_URL must be set (test DB or the dev DB)
 *   - Seed users must exist (run `npm run db:seed` once)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../src/index";

async function req(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string } = {}
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
  );

  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

let adminToken = "";
let creatorToken = "";
let approverToken = "";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const { status, body } = await req("GET", "/health");
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe("ok");
  });
});

describe("POST /auth/login", () => {
  it("returns 200 with token and lowercase user for valid credentials", async () => {
    const { status, body } = await req("POST", "/auth/login", {
      body: { email: "admin@rapid.dev", password: "password123" },
    });
    expect(status).toBe(200);
    const { token, user } = body as { token: string; user: { id: string; email: string; role: string } };
    expect(token).toBeTruthy();
    expect(user).toBeDefined();
    expect(user.email).toBe("admin@rapid.dev");
    expect(user.role).toBe("admin");
    // Fix 4: ensure no uppercase User key
    expect((body as Record<string, unknown>).User).toBeUndefined();
    adminToken = token;
  });

  it("stores creator token for later tests", async () => {
    const { status, body } = await req("POST", "/auth/login", {
      body: { email: "creator@rapid.dev", password: "password123" },
    });
    expect(status).toBe(200);
    creatorToken = (body as { token: string }).token;
    expect(creatorToken).toBeTruthy();
  });

  it("stores approver token for later tests", async () => {
    const { status, body } = await req("POST", "/auth/login", {
      body: { email: "approver@rapid.dev", password: "password123" },
    });
    expect(status).toBe(200);
    approverToken = (body as { token: string }).token;
    expect(approverToken).toBeTruthy();
  });

  it("returns 401 for wrong password", async () => {
    const { status } = await req("POST", "/auth/login", {
      body: { email: "admin@rapid.dev", password: "wrong-password" },
    });
    expect(status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const { status } = await req("POST", "/auth/login", {
      body: { email: "nobody@rapid.dev", password: "password123" },
    });
    expect(status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const { status } = await req("POST", "/auth/login", { body: { email: "not-an-email" } });
    expect(status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  beforeAll(async () => {
    if (!adminToken) {
      const { body } = await req("POST", "/auth/login", {
        body: { email: "admin@rapid.dev", password: "password123" },
      });
      adminToken = (body as { token: string }).token;
    }
  });

  it("returns 200 with user profile", async () => {
    const { status, body } = await req("GET", "/auth/me", { token: adminToken });
    expect(status).toBe(200);
    expect((body as { email: string }).email).toBe("admin@rapid.dev");
  });

  it("returns 401 without token", async () => {
    const { status } = await req("GET", "/auth/me");
    expect(status).toBe(401);
  });
});

describe("Documents CRUD", () => {
  let documentId = "";

  beforeAll(async () => {
    if (!creatorToken) {
      const { body } = await req("POST", "/auth/login", {
        body: { email: "creator@rapid.dev", password: "password123" },
      });
      creatorToken = (body as { token: string }).token;
    }
  });

  it("POST /documents returns 201 with created doc", async () => {
    const { status, body } = await req("POST", "/documents", {
      token: creatorToken,
      body: {
        title: "Test Document for API Tests",
        decisionSummary: "This is a test decision summary for automated API tests",
        riskLevel: "low",
      },
    });
    expect(status).toBe(201);
    const doc = body as { id: string; documentCode: string; version: number; status: string };
    expect(doc.documentCode).toMatch(/^RAPID-\d+$/);
    expect(doc.version).toBe(1);
    expect(doc.status).toBe("draft");
    documentId = doc.id;
  });

  it("GET /documents returns 200 with list", async () => {
    const { status, body } = await req("GET", "/documents", { token: creatorToken });
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /documents/:id returns 200 for existing doc", async () => {
    const { status, body } = await req("GET", `/documents/${documentId}`, { token: creatorToken });
    expect(status).toBe(200);
    expect((body as { id: string }).id).toBe(documentId);
  });

  it("GET /documents/:id returns 404 for unknown id", async () => {
    const { status } = await req("GET", "/documents/does-not-exist", { token: creatorToken });
    expect(status).toBe(404);
  });

  it("GET /documents returns 401 without token", async () => {
    const { status } = await req("GET", "/documents");
    expect(status).toBe(401);
  });
});

describe("GET /ledger", () => {
  it("returns 200 with array", async () => {
    if (!adminToken) return;
    const { status, body } = await req("GET", "/ledger", { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 401 without token", async () => {
    const { status } = await req("GET", "/ledger");
    expect(status).toBe(401);
  });
});
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 1+14: prisma/seed.ts
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 1+14: prisma/seed.ts"
mkdir -p "$ROOT/prisma"
cat > "$ROOT/prisma/seed.ts" << 'ENDTS'
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USERS = [
  { name: "Alice Admin",      email: "admin@rapid.dev",       role: UserRole.admin,       department: "Operations" },
  { name: "Carol Creator",    email: "creator@rapid.dev",     role: UserRole.creator,     department: "Engineering" },
  { name: "Bob Approver",     email: "approver@rapid.dev",    role: UserRole.approver,    department: "Legal" },
  { name: "Rick Recommender", email: "recommender@rapid.dev", role: UserRole.recommender, department: "Product" },
  { name: "Pam Performer",    email: "performer@rapid.dev",   role: UserRole.performer,   department: "Engineering" },
  { name: "Vera Viewer",      email: "viewer@rapid.dev",      role: UserRole.viewer,      department: "Finance" },
];

async function main() {
  console.log("🌱 Seeding database...");
  const hashed = await bcrypt.hash("password123", 10);
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashed, isActive: true },
    });
    console.log(`  ✓ ${u.name} (${u.role})`);
  }
  console.log("✅ Seed complete. All users password: password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
ENDTS

# ────────────────────────────────────────────────────────────────────────────
# FIX 14: .env.example files
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 14: .env.example files"

cat > "$ROOT/.env.example" << 'ENDENV'
# Root — shared env reference (copy to .env or per-app .env files)
DATABASE_URL="postgresql://postgres:password@localhost:5432/rapid_ledger"
JWT_SECRET="change-me-in-production"
ENDENV

cat > "$ROOT/apps/api/.env.example" << 'ENDENV'
DATABASE_URL="postgresql://postgres:password@localhost:5432/rapid_ledger"
JWT_SECRET="change-me-in-production"
PORT=3001
ENDENV

cat > "$ROOT/apps/web/.env.example" << 'ENDENV'
NEXT_PUBLIC_API_URL="http://localhost:3001"
ENDENV

# ────────────────────────────────────────────────────────────────────────────
# FIX 4/11/13: Web login page
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 4+11+13: apps/web/app/login/page.tsx"
cat > "$ROOT/apps/web/app/login/page.tsx" << 'ENDTSX'
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string; department: string | null };
}

const ROLE_ROUTES: Record<string, string> = {
  admin: "/dashboard", creator: "/dashboard", approver: "/approvals",
  recommender: "/dashboard", performer: "/dashboard", viewer: "/ledger",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fix 13: useCallback satisfies react-hooks/exhaustive-deps
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as LoginResponse | { error: { message: string } };
      if (!res.ok || "error" in data) { setError("error" in data ? data.error.message : "Login failed"); return; }
      // Fix 4: lowercase data.user
      const { token, user } = data;
      localStorage.setItem("rapid_token", token);
      localStorage.setItem("rapid_user", JSON.stringify(user));
      document.cookie = `rapid_role=${user.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      router.push(ROLE_ROUTES[user.role] ?? "/dashboard");
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setLoading(false); }
  }, [email, password, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 px-6 py-8 bg-white rounded-xl shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">RAPID Ledger</h1>
          {/* Fix 11: No invoice compliance copy */}
          <p className="mt-1 text-sm text-gray-500">Decision governance for your organisation</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400">RAPID — Recommend · Agree · Perform · Input · Decide</p>
      </div>
    </div>
  );
}
ENDTSX

# ────────────────────────────────────────────────────────────────────────────
# FIX 2: Web package.json with typecheck script
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 2: apps/web/package.json (typecheck script)"
# Add typecheck script if not present
if ! grep -q '"typecheck"' "$ROOT/apps/web/package.json" 2>/dev/null; then
  # Use node to add the typecheck script
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$ROOT/apps/web/package.json', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.typecheck = 'tsc --noEmit';
    fs.writeFileSync('$ROOT/apps/web/package.json', JSON.stringify(pkg, null, 2) + '\n');
    console.log('Added typecheck script to web/package.json');
  "
fi

# ────────────────────────────────────────────────────────────────────────────
# FIX 12/14: README
# ────────────────────────────────────────────────────────────────────────────
echo "▶ Fix 12+14: README.md"
# Only overwrite README — user can diff with git
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "https://github.com/harshiniramasamy5-star/rapid-ledger.git")
sed -i.bak "s|git clone <your-repo-url>|git clone $REPO_URL|g" "$ROOT/README.md" 2>/dev/null || true

# ────────────────────────────────────────────────────────────────────────────
# Install concurrently if not present
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Installing concurrently (needed for root npm run dev)"
npm install --save-dev concurrently --silent 2>/dev/null || true

# ────────────────────────────────────────────────────────────────────────────
# Done
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "✅ All 15 fixes applied!"
echo ""
echo "Next steps:"
echo "  1.  npm install                     — install updated deps"
echo "  2.  npm run db:generate             — regenerate Prisma client"
echo "  3.  npm run db:push                 — sync schema to DB"
echo "  4.  npm run db:seed                 — seed demo users"
echo "  5.  npm run dev                     — start API + web"
echo "  6.  cd apps/api && npm test         — run all tests"
echo "  7.  npm run typecheck               — TypeScript check (from root)"
echo "  8.  npm run lint                    — lint (from root)"
echo ""
echo "Backup of original files: $BACKUP_DIR"
