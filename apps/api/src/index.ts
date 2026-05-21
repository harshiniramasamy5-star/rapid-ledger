import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { can, type Role } from "./middleware/permissions";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "rapid-ledger-dev-secret";
const PORT = parseInt(process.env.PORT ?? "3001");

function requireAuth(headers: any, set: any) {
  const auth = headers["authorization"];
  if (!auth?.startsWith("Bearer ")) { set.status = 401; throw new Error("Auth required"); }
  try { return jwt.verify(auth.slice(7), JWT_SECRET) as any; }
  catch { set.status = 401; throw new Error("Invalid token"); }
}

function requireRole(headers: any, set: any, action: string) {
  const p = requireAuth(headers, set);
  if (!can(p.role as Role, action)) {
    set.status = 403;
    throw new Error(`Forbidden: role '${p.role}' cannot perform '${action}'`);
  }
  return p;
}

async function logAudit(actorId: string, action: string, objectType: string, objectId: string, details?: string, documentId?: string) {
  try {
    await prisma.auditLog.create({
      data: { id: crypto.randomUUID(), actorId, action: action as any, objectType, objectId, details: details ?? null, documentId: documentId ?? null }
    });
  } catch (e) { console.error("Audit log error:", e); }
}

const app = new Elysia({ adapter: node() })
  .use(cors({
    origin: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }))

  .get("/health", () => ({
    status: "ok", service: "rapid-ledger-api", version: "2.0.0", db: "postgresql",
    timestamp: new Date().toISOString(),
  }))

  // ── Auth ──
  .post("/auth/login", async ({ body, set }: any) => {
    try {
      const { email, password } = body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) { set.status = 401; return { error: { message: "Invalid email or password" } }; }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) { set.status = 401; return { error: { message: "Invalid email or password" } }; }
      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      const { passwordHash, ...safe } = user;
      await logAudit(user.id, "user_login", "User", user.id, `Login: ${user.email}`);
      return { token, User: safe };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .get("/auth/me", async ({ headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const user = await prisma.user.findUnique({
        where: { id: p.userId },
        select: { id:true, name:true, email:true, role:true, department:true, isActive:true, createdAt:true, updatedAt:true },
      });
      if (!user) { set.status = 401; return { error: { message: "User not found" } }; }
      return user;
    } catch (e: any) { set.status = 401; return { error: { message: e.message } }; }
  })

  // ── Admin: Users ──
  .get("/admin/users", async ({ headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      if (p.role !== "admin") { set.status = 403; return { error: { message: "Admin only" } }; }
      return await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id:true, name:true, email:true, role:true, department:true, isActive:true, createdAt:true, updatedAt:true },
      });
    } catch (e: any) { return { error: { message: e.message } }; }
  })

  .post("/admin/users", async ({ body, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      if (p.role !== "admin") { set.status = 403; return { error: { message: "Admin only" } }; }
      const { name, email, password, role, department } = body;
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) { set.status = 409; return { error: { message: "Email already exists" } }; }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { id: crypto.randomUUID(), name, email, passwordHash, role, department: department || null, updatedAt: new Date() },
        select: { id:true, name:true, email:true, role:true, department:true, isActive:true, createdAt:true },
      });
      await logAudit(p.userId, "user_created", "User", user.id, `Created ${email} as ${role}`);
      set.status = 201;
      return user;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/admin/users/:id/deactivate", async ({ params, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      if (p.role !== "admin") { set.status = 403; return { error: { message: "Admin only" } }; }
      if (p.userId === params.id) { set.status = 400; return { error: { message: "Cannot deactivate yourself" } }; }
      const user = await prisma.user.update({ where: { id: params.id }, data: { isActive: false }, select: { id:true, name:true, isActive:true } });
      await logAudit(p.userId, "user_deactivated", "User", params.id, `Deactivated ${params.id}`);
      return { ok: true, user };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/admin/users/:id/activate", async ({ params, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      if (p.role !== "admin") { set.status = 403; return { error: { message: "Admin only" } }; }
      const user = await prisma.user.update({ where: { id: params.id }, data: { isActive: true }, select: { id:true, name:true, isActive:true } });
      await logAudit(p.userId, "user_activated", "User", params.id, `Activated ${params.id}`);
      return { ok: true, user };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Users ──
  .get("/users", async ({ headers, set }: any) => {
    try {
      requireAuth(headers, set);
      return await prisma.user.findMany({
        where: { isActive: true }, orderBy: { name: "asc" },
        select: { id:true, name:true, email:true, role:true, department:true },
      });
    } catch (e: any) { set.status = 401; return { error: { message: e.message } }; }
  })

  // ── Documents ──
  .get("/documents", async ({ headers, set }: any) => {
    try {
      requireRole(headers, set, "document:read");
      return await prisma.rapidDocument.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          RapidRoleAssignment: { include: { User: { select: { id:true, name:true, email:true } } } },
          Evidence: true,
        },
      });
    } catch (e: any) { return { error: { message: e.message } }; }
  })

  .get("/documents/:id", async ({ params, headers, set }: any) => {
    try {
      requireRole(headers, set, "document:read");
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: {
          RapidRoleAssignment: { include: { User: { select: { id:true, name:true, email:true } } } },
          Evidence: true,
          Approval: { include: { User: { select: { id:true, name:true, email:true } } } },
          AuditLog: { include: { User: { select: { id:true, name:true } } }, orderBy: { createdAt: "desc" } },
        },
      });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      return doc;
    } catch (e: any) { return { error: { message: e.message } }; }
  })

  .post("/documents", async ({ body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:create");
      const count = await prisma.rapidDocument.count();
      const code = "RAPID-" + String(count + 1).padStart(3, "0");
      const doc = await prisma.rapidDocument.create({
        data: {
          id: crypto.randomUUID(),
          documentCode: code,
          title: body.title,
          decisionSummary: body.decisionSummary ?? "",
          businessContext: body.businessContext ?? "",
          problemStatement: body.problemStatement ?? "",
          proposedDecision: body.proposedDecision ?? "",
          alternativesConsidered: body.alternativesConsidered ?? "",
          riskLevel: body.riskLevel ?? "low",
          complianceImpact: !!body.complianceImpact,
          department: body.department ?? "",
          deadline: body.deadline ? new Date(body.deadline) : new Date(Date.now() + 30*24*60*60*1000),
          status: "draft",
          version: 1,
          createdBy: p.userId,
          updatedAt: new Date(),
        },
      });
      await logAudit(p.userId, "document_created", "RapidDocument", doc.id, `Created ${code}`, doc.id);
      set.status = 201;
      return doc;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .put("/documents/:id", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:edit");
      const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (!["draft","needs_changes"].includes(doc.status)) {
        set.status = 422; return { error: { message: "Only draft or needs_changes documents can be edited" } };
      }
      if (doc.createdBy !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the creator can edit this document" } };
      }
      const updated = await prisma.rapidDocument.update({
        where: { id: params.id },
        data: {
          title: body.title ?? doc.title,
          decisionSummary: body.decisionSummary ?? doc.decisionSummary,
          businessContext: body.businessContext ?? doc.businessContext,
          problemStatement: body.problemStatement ?? doc.problemStatement,
          proposedDecision: body.proposedDecision ?? doc.proposedDecision,
          alternativesConsidered: body.alternativesConsidered ?? doc.alternativesConsidered,
          riskLevel: body.riskLevel ?? doc.riskLevel,
          complianceImpact: body.complianceImpact ?? doc.complianceImpact,
          department: body.department ?? doc.department,
          deadline: body.deadline ? new Date(body.deadline) : doc.deadline,
          updatedAt: new Date(),
        },
      });
      await logAudit(p.userId, "document_updated", "RapidDocument", params.id, "Document edited", params.id);
      return updated;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/roles", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:edit");
      const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.createdBy !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the creator can assign roles" } };
      }
      const role = await prisma.rapidRoleAssignment.create({
        data: { id: crypto.randomUUID(), documentId: params.id, roleType: body.roleType, userId: body.userId },
      });
      await logAudit(p.userId, "role_assigned", "RapidDocument", params.id, `Assigned ${body.roleType} to ${body.userId}`, params.id);
      set.status = 201;
      return { ok: true, id: role.id };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .delete("/documents/:id/roles/:roleId", async ({ params, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:edit");
      const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.createdBy !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the creator can remove roles" } };
      }
      await prisma.rapidRoleAssignment.delete({ where: { id: params.roleId } });
      return { ok: true };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/evidence", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "evidence:upload");
      const ev = await prisma.evidence.create({
        data: {
          id: crypto.randomUUID(),
          documentId: params.id,
          type: body.type ?? "document",
          title: body.title ?? "",
          urlOrPath: body.urlOrPath ?? "",
          description: body.description ?? "",
          uploadedBy: p.userId,
        },
      });
      await logAudit(p.userId, "evidence_uploaded", "Evidence", ev.id, `Evidence: ${body.title}`, params.id);
      set.status = 201;
      return { ok: true, id: ev.id };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/submit", async ({ params, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:submit");
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: true, Evidence: true },
      });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (!["draft","needs_changes"].includes(doc.status)) {
        set.status = 422; return { error: { message: "Only draft or needs_changes documents can be submitted" } };
      }
      if (doc.createdBy !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the creator can submit this document" } };
      }
      const roles = doc.RapidRoleAssignment;
      const errors: string[] = [];
      if (!roles.find((r: any) => r.roleType === "recommend")) errors.push("Recommend owner is required");
      if (!roles.find((r: any) => r.roleType === "perform"))   errors.push("Perform owner is required");
      const deciders = roles.filter((r: any) => r.roleType === "decide");
      if (deciders.length === 0) errors.push("Exactly one Decide owner is required");
      if (deciders.length > 1)   errors.push("Only one Decide owner is allowed");
      if (["high","critical"].includes(doc.riskLevel) && !roles.find((r: any) => r.roleType === "agree")) {
        errors.push("High/critical risk decisions require at least one Agree approver");
      }
      if (doc.complianceImpact && doc.Evidence.length === 0) {
        errors.push("Compliance-impacting decisions require at least one evidence item");
      }
      if (errors.length > 0) { set.status = 422; return { error: { message: errors[0], details: errors } }; }

      const agreeRoles = roles.filter((r: any) => r.roleType === "agree");
      const nextStatus = agreeRoles.length > 0 ? "awaiting_agreement" : "approved";
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: nextStatus, submittedAt: new Date(), updatedAt: new Date() } });
      for (const ar of agreeRoles) {
        await prisma.approval.create({
          data: { id: crypto.randomUUID(), documentId: params.id, approverId: ar.userId, status: "pending", updatedAt: new Date() },
        });
      }
      await logAudit(p.userId, "document_submitted", "RapidDocument", params.id, `Submitted → ${nextStatus}`, params.id);
      return await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: { include: { User: true } }, Evidence: true },
      });
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Approvals ──
  .get("/approvals/my", async ({ headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:approve");
      return await prisma.approval.findMany({
        where: { approverId: p.userId, status: "pending" },
        include: { RapidDocument: { include: { RapidRoleAssignment: true, Evidence: true } } },
      });
    } catch (e: any) { set.status = 401; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/approvals/:approvalId/approve", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:approve");
      const approval = await prisma.approval.findUnique({ where: { id: params.approvalId } });
      if (!approval) { set.status = 404; return { error: { message: "Approval not found" } }; }
      if (approval.approverId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "You are not the assigned approver" } };
      }
      await prisma.approval.update({ where: { id: params.approvalId }, data: { status: "approved", notes: body?.notes ?? "", updatedAt: new Date() } });
      const pending = await prisma.approval.count({ where: { documentId: params.id, status: "pending" } });
      if (pending === 0) {
        await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "approved", updatedAt: new Date() } });
      }
      await logAudit(p.userId, "document_approved", "RapidDocument", params.id, "Approved", params.id);
      return { ok: true, status: "approved" };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/approvals/:approvalId/reject", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:reject");
      const approval = await prisma.approval.findUnique({ where: { id: params.approvalId } });
      if (!approval) { set.status = 404; return { error: { message: "Approval not found" } }; }
      if (approval.approverId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "You are not the assigned approver" } };
      }
      await prisma.approval.update({ where: { id: params.approvalId }, data: { status: "rejected", notes: body?.notes ?? "", updatedAt: new Date() } });
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "rejected", updatedAt: new Date() } });
      await logAudit(p.userId, "document_rejected", "RapidDocument", params.id, `Rejected: ${body?.notes ?? ""}`, params.id);
      return { ok: true, status: "rejected" };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/approvals/:approvalId/request-changes", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:request_changes");
      const approval = await prisma.approval.findUnique({ where: { id: params.approvalId } });
      if (!approval) { set.status = 404; return { error: { message: "Approval not found" } }; }
      if (approval.approverId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "You are not the assigned approver" } };
      }
      await prisma.approval.update({ where: { id: params.approvalId }, data: { status: "changes_requested", notes: body?.notes ?? "", updatedAt: new Date() } });
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "needs_changes", updatedAt: new Date() } });
      await logAudit(p.userId, "changes_requested", "RapidDocument", params.id, `Changes: ${body?.notes ?? ""}`, params.id);
      return { ok: true, status: "changes_requested" };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Finalize ──
  .post("/documents/:id/finalize", async ({ params, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:finalize");
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: true },
      });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.status !== "approved") { set.status = 422; return { error: { message: "Document must be approved before finalizing" } }; }
      const decideRole  = doc.RapidRoleAssignment.find((r: any) => r.roleType === "decide");
      const performRole = doc.RapidRoleAssignment.find((r: any) => r.roleType === "perform");
      if (!decideRole) { set.status = 422; return { error: { message: "No Decide owner assigned" } }; }
      if (decideRole.userId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the Decide owner can finalize" } };
      }
      const now = new Date();
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "finalized", finalizedAt: now, updatedAt: now } });
      await prisma.ledgerEntry.create({
        data: {
          id: crypto.randomUUID(),
          documentId: params.id,
          documentCode: doc.documentCode,
          title: doc.title,
          finalDecision: doc.proposedDecision ?? doc.decisionSummary ?? "",
          decideOwnerId: decideRole.userId,
          performOwnerId: performRole?.userId ?? decideRole.userId,
          riskLevel: doc.riskLevel,
          complianceImpact: doc.complianceImpact,
          version: doc.version,
          finalizedAt: now,
        },
      });
      await logAudit(p.userId, "document_finalized", "RapidDocument", params.id, "Finalized → ledger entry created", params.id);
      return await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: { include: { User: true } }, Evidence: true },
      });
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Version ──
  .post("/documents/:id/version", async ({ params, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:version");
      const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.status !== "finalized") { set.status = 422; return { error: { message: "Can only version a finalized document" } }; }
      const count = await prisma.rapidDocument.count();
      const newDoc = await prisma.rapidDocument.create({
        data: {
          id: crypto.randomUUID(),
          documentCode: "RAPID-" + String(count + 1).padStart(3, "0"),
          title: doc.title,
          decisionSummary: doc.decisionSummary,
          businessContext: doc.businessContext ?? "",
          problemStatement: doc.problemStatement ?? "",
          proposedDecision: doc.proposedDecision ?? "",
          alternativesConsidered: doc.alternativesConsidered ?? "",
          riskLevel: doc.riskLevel,
          complianceImpact: doc.complianceImpact,
          department: doc.department,
          deadline: doc.deadline,
          status: "draft",
          version: doc.version + 1,
          parentDocumentId: doc.id,
          createdBy: p.userId,
          updatedAt: new Date(),
        },
      });
      await logAudit(p.userId, "document_versioned", "RapidDocument", newDoc.id, `v${newDoc.version} from ${doc.documentCode}`, newDoc.id);
      set.status = 201;
      return newDoc;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Execution Complete ──
  .post("/documents/:id/execution-complete", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireRole(headers, set, "document:execute");
      const notes = (body?.notes ?? "").trim();
      if (!notes) { set.status = 400; return { error: { message: "Execution notes are required" } }; }
      const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id }, include: { RapidRoleAssignment: true } });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.status !== "finalized") { set.status = 422; return { error: { message: "Document must be finalized first" } }; }
      const performRole = doc.RapidRoleAssignment.find((r: any) => r.roleType === "perform");
      if (performRole?.userId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the Perform owner can mark execution complete" } };
      }
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "execution_complete", updatedAt: new Date() } });
      await logAudit(p.userId, "execution_completed", "RapidDocument", params.id, `Execution complete: ${notes}`, params.id);
      return { id: params.id, status: "execution_complete", notes };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Ledger (read-only) ──
  .get("/ledger", async ({ headers, set }: any) => {
    try {
      requireRole(headers, set, "ledger:read");
      return await prisma.ledgerEntry.findMany({
        orderBy: { finalizedAt: "desc" },
        include: {
          User_LedgerEntry_decideOwnerIdToUser:  { select: { id:true, name:true, email:true } },
          User_LedgerEntry_performOwnerIdToUser: { select: { id:true, name:true, email:true } },
          RapidDocument: { select: { documentCode:true, title:true, status:true } },
        },
      });
    } catch (e: any) { return { error: { message: e.message } }; }
  })

  .get("/ledger/export", async ({ headers, set }: any) => {
    try {
      requireRole(headers, set, "ledger:read");
      const entries = await prisma.ledgerEntry.findMany({
        orderBy: { finalizedAt: "desc" },
        include: {
          User_LedgerEntry_decideOwnerIdToUser:  { select: { name:true, email:true } },
          User_LedgerEntry_performOwnerIdToUser: { select: { name:true, email:true } },
        },
      });
      const rows = entries.map((e: any) => [
        e.documentCode, e.title.replace(/,/g,""), (e.finalDecision ?? "").replace(/,/g,""),
        e.riskLevel, e.complianceImpact ? "Yes" : "No", e.version,
        e.decideOwner?.name ?? "", e.decideOwner?.email ?? "",
        e.performOwner?.name ?? "", e.performOwner?.email ?? "",
        new Date(e.finalizedAt).toLocaleDateString(),
      ].join(","));
      const csv = ["Code,Title,Final Decision,Risk,Compliance,Version,Decide Owner,Decide Email,Perform Owner,Perform Email,Finalized On", ...rows].join("\n");
      set.headers = { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=rapid-ledger-export.csv" };
      return csv;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Audit Log ──
  .get("/audit-log", async ({ headers, set }: any) => {
    try {
      requireRole(headers, set, "auditlog:read");
      const entries = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" }, take: 200,
        include: { User: { select: { name:true, email:true, role:true } } },
      });
      return entries.map((e: any) => ({
        ...e, actorName: e.actor?.name, actorEmail: e.actor?.email, actorRole: e.actor?.role,
      }));
    } catch (e: any) { return { error: { message: e.message } }; }
  })

  .listen(PORT);

console.log(`RAPID Ledger API running on http://localhost:${PORT} (PostgreSQL + Prisma)`);
