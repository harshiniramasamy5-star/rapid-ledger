import { Elysia } from "elysia";
import { node } from "@elysiajs/node";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? "rapid-ledger-dev-secret";
const PORT = parseInt(process.env.PORT ?? "3001");

function getPayload(auth: string) {
  return jwt.verify(auth.slice(7), JWT_SECRET) as any;
}

function requireAuth(headers: any, set: any) {
  if (!headers["authorization"]) {
    set.status = 401;
    throw new Error("Auth required");
  }
  try {
    return getPayload(headers["authorization"]);
  } catch {
    set.status = 401;
    throw new Error("Invalid token");
  }
}

const app = new Elysia({ adapter: node() })
  .use(cors({
    origin: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }))

  // ── Health ──
  
async function logAudit(actorId: string, action: string, objectType: string, objectId: string, details?: string, documentId?: string) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, objectType, objectId, details: details ?? null, documentId: documentId ?? null }
    });
  } catch (e) { console.error("Audit log error:", e); }
}


app
.get("/health", () => ({
    status: "ok", service: "rapid-ledger-api",
    version: "2.0.0", db: "postgresql",
    timestamp: new Date().toISOString(),
  }))

  // ── Auth ──
  .post("/auth/login", async ({ body, set }: any) => {
    const { email, password } = body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      set.status = 401;
      return { error: { message: "Invalid email or password" } };
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      set.status = 401;
      return { error: { message: "Invalid email or password" } };
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET, { expiresIn: "7d" }
    );
    const { passwordHash, ...safe } = user;
    return { token, user: safe };
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
        data: { name, email, passwordHash, role, department: department || null },
        select: { id:true, name:true, email:true, role:true, department:true, isActive:true, createdAt:true },
      });
      set.status = 201;
      return user;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/admin/users/:id/deactivate", async ({ params, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      if (p.role !== "admin") { set.status = 403; return { error: { message: "Admin only" } }; }
      if (p.userId === params.id) { set.status = 400; return { error: { message: "Cannot deactivate yourself" } }; }
      const user = await prisma.user.update({
        where: { id: params.id },
        data: { isActive: false },
        select: { id:true, name:true, isActive:true },
      });
      return { ok: true, user };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/admin/users/:id/activate", async ({ params, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      if (p.role !== "admin") { set.status = 403; return { error: { message: "Admin only" } }; }
      const user = await prisma.user.update({
        where: { id: params.id },
        data: { isActive: true },
        select: { id:true, name:true, isActive:true },
      });
      return { ok: true, user };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Users ──
  .get("/users", async ({ headers, set }: any) => {
    try {
      requireAuth(headers, set);
      return await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id:true, name:true, email:true, role:true, department:true },
      });
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Documents ──
  .get("/documents", async ({ headers, set }: any) => {
    try {
      requireAuth(headers, set);
      const docs = await prisma.rapidDocument.findMany({
        orderBy: { updatedAt: "desc" },
        include: { RapidRoleAssignment: { include: { User: { select: { id:true, name:true, email:true } } } }, Evidence: true },
      });
      return docs;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .get("/documents/:id", async ({ params, headers, set }: any) => {
    try {
      requireAuth(headers, set);
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: { include: { User: { select: { id:true, name:true, email:true } } } }, Evidence: true },
      });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      return doc;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents", async ({ body, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const count = await prisma.rapidDocument.count();
      const code  = "RAPID-" + String(count + 1).padStart(3, "0");
      const { randomBytes } = await import("crypto");
      const newId = "doc_" + randomBytes(8).toString("hex");
      const doc   = await prisma.rapidDocument.create({
        data: {
          id: newId,
          documentCode: code,
          title: body.title,
          decisionSummary: body.decisionSummary ?? "",
          businessContext: body.businessContext ?? "",
          problemStatement: body.problemStatement ?? "",
          proposedDecision: body.proposedDecision ?? "",
          alternativesConsidered: body.alternativesConsidered ?? "",
          riskLevel: body.riskLevel,
          complianceImpact: !!body.complianceImpact,
          department: body.department ?? "",
          deadline: body.deadline ? new Date(body.deadline) : null,
          status: "draft",
          version: 1,
          createdBy: p.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      set.status = 201;
      return doc;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/roles", async ({ params, body, headers, set }: any) => {
    try {
      requireAuth(headers, set);
      const role = await prisma.rapidRoleAssignment.create({
        data: { documentId: params.id, roleType: body.roleType, userId: body.userId },
      });
      set.status = 201;
      return { ok: true, id: role.id };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/evidence", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const ev = await prisma.evidence.create({
        data: {
          documentId: params.id,
          type: body.type,
          title: body.title ?? "",
          urlOrPath: body.urlOrPath ?? "",
          description: body.description ?? "",
          uploadedBy: p.userId,
        },
      });
      set.status = 201;
      return { ok: true, id: ev.id };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/submit", async ({ params, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: true, Evidence: true },
      });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.status !== "draft") { set.status = 422; return { error: { message: "Only draft documents can be submitted" } }; }

      const roles   = doc.RapidRoleAssignment;
      const errors: string[] = [];
      if (!roles.find(r => r.roleType === "recommend")) errors.push("Recommend owner is required");
      if (!roles.find(r => r.roleType === "perform"))   errors.push("Perform owner is required");
      const deciders = roles.filter(r => r.roleType === "decide");
      if (deciders.length === 0) errors.push("Exactly one Decide owner is required");
      if (deciders.length > 1)   errors.push("Only one Decide owner is allowed");
      if (["high","critical"].includes(doc.riskLevel) && !roles.find(r => r.roleType === "agree")) {
        errors.push("High risk decisions require at least one Agree approver");
      }
      if (doc.complianceImpact && doc.Evidence.length === 0) {
        errors.push("Compliance-impacting decisions require at least one evidence item");
      }
      if (errors.length > 0) { set.status = 422; return { error: { message: errors[0], details: errors } }; }

      const agreeRoles = roles.filter(r => r.roleType === "agree");
      const nextStatus = agreeRoles.length > 0 ? "awaiting_agreement" : "approved";

      await prisma.rapidDocument.update({
        where: { id: params.id },
        data: { status: nextStatus, submittedAt: new Date() },
      });

      for (const ar of agreeRoles) {
        await prisma.approval.create({
          data: { documentId: params.id, approverId: ar.userId, status: "pending" },
        });
      }
      await logAudit(p.userId, "document_submitted", "RapidDocument", params.id, `status:${nextStatus}`, params.id);
      await logAudit(p.userId, "document_submitted", "RapidDocument", params.id, `Submitted as ${nextStatus}`, params.id);

      return await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: { include: { User: true } }, Evidence: true },
      });
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Approvals ──
  .get("/approvals/my", async ({ headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const approvals = await prisma.approval.findMany({
        where: { approverId: p.userId, status: "pending" },
        include: { document: { include: { RapidRoleAssignment: true, Evidence: true } } },
      });
      return approvals;
    } catch (e: any) { set.status = 401; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/approvals/:approvalId/approve", async ({ params, body, headers, set }: any) => {
    try {
      requireAuth(headers, set);
      await prisma.approval.update({
        where: { id: params.approvalId },
        data: { status: "approved", notes: body?.notes ?? "" },
      });
      const pending = await prisma.approval.count({ where: { documentId: params.id, status: "pending" } });
      if (pending === 0) {
        await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "approved" } });
      }
      await logAudit(p.userId, "approval_added", "RapidDocument", params.id, "Approved", params.id);
      await logAudit(p.userId, "approval_added", "RapidDocument", params.id, "approved", params.id);
      return { ok: true, status: "approved" };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/approvals/:approvalId/reject", async ({ params, body, headers, set }: any) => {
    try {
      requireAuth(headers, set);
      await prisma.approval.update({ where: { id: params.approvalId }, data: { status: "rejected", notes: body?.notes ?? "" } });
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "rejected" } });
      await logAudit(p.userId, "document_rejected", "RapidDocument", params.id, "Rejected", params.id);
      await logAudit(p.userId, "document_rejected", "RapidDocument", params.id, "rejected", params.id);
      return { ok: true, status: "rejected" };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/approvals/:approvalId/request-changes", async ({ params, body, headers, set }: any) => {
    try {
      requireAuth(headers, set);
      await prisma.approval.update({ where: { id: params.approvalId }, data: { status: "changes_requested", notes: body?.notes ?? "" } });
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "needs_changes" } });
      await logAudit(p.userId, "changes_requested", "RapidDocument", params.id, "changes_requested", params.id);
      await logAudit(p.userId, "changes_requested", "RapidDocument", params.id, "Changes requested", params.id);
      return { ok: true, status: "changes_requested" };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Finalize ──
  .post("/documents/:id/finalize", async ({ params, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: true },
      });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.status !== "approved") { set.status = 422; return { error: { message: "Document must be approved first" } }; }

      const decideRole   = doc.RapidRoleAssignment.find(r => r.roleType === "decide");
      const performRole  = doc.RapidRoleAssignment.find(r => r.roleType === "perform");
      if (!decideRole) { set.status = 422; return { error: { message: "No Decide owner assigned" } }; }
      if (decideRole.userId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the Decide owner can finalize" } };
      }

      const now = new Date();
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "finalized", finalizedAt: now } });
      await logAudit(p.userId, "document_finalized", "RapidDocument", params.id, "finalized", params.id);
      await logAudit(p.userId, "document_finalized", "RapidDocument", params.id, "Finalized", params.id);
      await prisma.ledgerEntry.create({
        data: {
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

      return await prisma.rapidDocument.findUnique({
        where: { id: params.id },
        include: { RapidRoleAssignment: { include: { User: true } }, Evidence: true },
      });
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Ledger ──
  .get("/ledger", async ({ headers, set }: any) => {
    try {
      requireAuth(headers, set);
      const entries = await prisma.ledgerEntry.findMany({
        orderBy: { finalizedAt: "desc" },
      });
      const withOwners = await Promise.all(entries.map(async e => ({
        ...e,
        decideOwner:  await prisma.user.findUnique({ where: { id: e.decideOwnerId }, select: { id:true, name:true, email:true } }),
        performOwner: e.performOwnerId ? await prisma.user.findUnique({ where: { id: e.performOwnerId }, select: { id:true, name:true, email:true } }) : null,
      })));
      return withOwners;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .get("/ledger/export", async ({ headers, set }: any) => {
    try {
      requireAuth(headers, set);
      const entries = await prisma.ledgerEntry.findMany({ orderBy: { finalizedAt: "desc" } });
      const rows = await Promise.all(entries.map(async e => {
        const decider   = await prisma.user.findUnique({ where: { id: e.decideOwnerId } });
        const performer = e.performOwnerId ? await prisma.user.findUnique({ where: { id: e.performOwnerId } }) : null;
        return [
          e.documentCode, e.title.replace(/,/g,""), (e.finalDecision ?? "").replace(/,/g,""),
          e.riskLevel, e.complianceImpact ? "Yes" : "No", e.version,
          decider?.name ?? "", decider?.email ?? "",
          performer?.name ?? "", performer?.email ?? "",
          new Date(e.finalizedAt).toLocaleDateString(),
        ].join(",");
      }));
      const csv = ["Code,Title,Final Decision,Risk,Compliance,Version,Decide Owner,Decide Email,Perform Owner,Perform Email,Finalized On", ...rows].join("\n");
      set.headers["Content-Type"] = "text/csv";
      set.headers["Content-Disposition"] = "attachment; filename=rapid-ledger-export.csv";
      return csv;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  // ── Audit Log ──
  .get("/audit-log", async ({ query, headers, set }: any) => {
    try {
      requireAuth(headers, set);
      const entries = await prisma.auditLog.findMany({
        where: undefined,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          User: { select: { name:true, email:true, role:true } },
        },
      });
      const withDocs = await Promise.all(entries.map(async (e: any) => {
        let docCode = null;
        let docTitle = null;
        if (e.objectType === "RapidDocument" && e.objectId) {
          try {
            const doc = await prisma.rapidDocument.findUnique({
              where: { id: e.objectId },
              select: { documentCode: true, title: true },
            });
            docCode = doc?.documentCode ?? null;
            docTitle = doc?.title ?? null;
          } catch {}
        }
        return {
          ...e,
          actorName: e.User?.name,
          actorEmail: e.User?.email,
          actorRole: e.User?.role,
          documentCode: docCode,
          documentTitle: docTitle,
        };
      }));
      return withDocs;
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .post("/documents/:id/execution-complete", async ({ params, body, headers, set }: any) => {
    try {
      const p = requireAuth(headers, set);
      const notes = (body?.notes ?? "").trim();
      if (!notes) { set.status = 400; return { error: { message: "Execution notes are required" } }; }
      const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id }, include: { RapidRoleAssignment: true } });
      if (!doc) { set.status = 404; return { error: { message: "Not found" } }; }
      if (doc.status !== "finalized") { set.status = 422; return { error: { message: "Document must be finalized first" } }; }
      const performRole = doc.RapidRoleAssignment.find(r => r.roleType === "perform");
      if (performRole?.userId !== p.userId && p.role !== "admin") {
        set.status = 403; return { error: { message: "Only the Perform owner can mark execution complete" } };
      }
      await logAudit(p.userId, "execution_completed", "RapidDocument", params.id, "Execution completed", params.id);
      await prisma.rapidDocument.update({ where: { id: params.id }, data: { status: "execution_complete" } });
      return { id: params.id, status: "execution_complete", notes };
    } catch (e: any) { set.status = 500; return { error: { message: e.message } }; }
  })

  .listen(PORT);

console.log(`RAPID Ledger API running on http://localhost:${PORT} (PostgreSQL + Prisma)`);
