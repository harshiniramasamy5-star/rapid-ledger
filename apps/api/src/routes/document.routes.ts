import { Elysia } from "elysia";
import { createAuditLog } from "../services/audit.service";
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
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { finalizeDocument } from "../services/ledger.service";
import { generateDocumentPdf } from "../services/pdf.service";
import type { DocumentStatus } from "@prisma/client";

export const documentRoutes = new Elysia({ prefix: "/documents" })
  .use(authMiddleware)

  // ── GET /documents/:id/export-pdf ────────────────────────────────────────
  .get("/:id/export-pdf", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: params.id },
      include: {
        roleAssignments: { include: { user: { select: { name: true, email: true } } } },
        approvals: { include: { approver: { select: { name: true, email: true } } } },
        evidence: true,
      },
    });
    if (!doc) { set.status = 404; return { error: { code: "NOT_FOUND", message: "Document not found" } }; }
    const pdf = generateDocumentPdf(doc);
    set.headers = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${doc.documentCode}-v${doc.version}.pdf"`,
      "Content-Length": String(pdf.length),
    };
    return pdf;
  })

  // ── GET /documents ────────────────────────────────────────────────────────
  .get("/", async ({ user, query, set }) => {
    requirePermission(user, "document:read", set);
    return listDocuments({
      status: query.status as DocumentStatus | undefined,
      department: query.department,
      riskLevel: query.riskLevel,
      search: query.search,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  })

  // ── POST /documents ───────────────────────────────────────────────────────
  .post("/", async ({ user, body: _body, set }) => {
    requirePermission(user, "document:create", set);
    const parsed = parseBody(createDocumentSchema, _body);
    if (!parsed.ok) {
      set.status = 400;
      return Errors.badRequest("Invalid document data", parsed.errors);
    }
    const doc = await createDocument({ ...parsed.data, riskLevel: parsed.data.riskLevel ?? "low" }, user.id);
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
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["draft", "needs_changes"]); }
      if ("validationErrors" in result) { set.status = 422; return Errors.badRequest("Document failed validation", result.validationErrors?.map((e: { message: string }) => e.message)); }
    }
    return result.document;
  })

  // ── POST /documents/:id/approve ───────────────────────────────────────────
  .post("/:id/approve", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "document:approve", set);
    const parsed = parseBody(approvalSchema, _body ?? {});
    const result = await approveDocument(params.id, user.id, parsed.ok ? parsed.data.comment : undefined);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["awaiting_agreement"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/reject ────────────────────────────────────────────
  .post("/:id/reject", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "document:reject", set);
    const parsed = parseBody(approvalSchema, _body ?? {});
    const result = await rejectDocument(params.id, user.id, parsed.ok ? parsed.data.comment : undefined);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["awaiting_agreement"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/needs-changes ─────────────────────────────────────
  .post("/:id/needs-changes", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "document:reject", set);
    const parsed = parseBody(approvalSchema, _body ?? {});
    const result = await requestChanges(params.id, user.id, parsed.ok ? parsed.data.comment : undefined);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["awaiting_agreement"]); }
    }
    return result.document;
  })

  // ── POST /documents/:id/finalize ──────────────────────────────────────────
  .post("/:id/finalize", async ({ user, params, set }) => {
    requirePermission(user, "document:finalize", set);
    const result = await finalizeDocument(params.id, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["approved"]); }
    }
    return result.document;
  })



  // ── POST /documents/:id/recommend ────────────────────────────────────────
  .post("/:id/recommend", async ({ user, params, body, set }) => {
    const { prisma } = await import("../lib/prisma");
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    const assignment = await prisma.roleAssignment.findFirst({
      where: { documentId: params.id, userId: user.id, roleType: "recommend" }
    });
    if (!assignment) { set.status = 403; return Errors.forbidden("You are not assigned the Recommend role on this document"); }
    const updated = await prisma.rapidDocument.update({
      where: { id: params.id },
      data: { recommendationNotes: (body as { notes?: string }).notes ?? "" },
    });
    await createAuditLog(user.id, "document_recommended", "RapidDocument", params.id, { documentCode: updated.documentCode });
    return updated;
  })


  // ── POST /documents/:id/input ─────────────────────────────────────────────
  .post("/:id/input", async ({ user, params, body, set }) => {
    const { prisma } = await import("../lib/prisma");
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    const assignment = await prisma.roleAssignment.findFirst({
      where: { documentId: params.id, userId: user.id, roleType: "input" }
    });
    if (!assignment) { set.status = 403; return Errors.forbidden("You are not assigned the Input role on this document"); }
    const updated = await prisma.rapidDocument.update({
      where: { id: params.id },
      data: { inputNotes: (body as { notes?: string }).notes ?? "" },
    });
    await createAuditLog(user.id, "document_input_provided", "RapidDocument", params.id, { documentCode: updated.documentCode });
    return updated;
  })

  // ── POST /documents/:id/execution-complete ────────────────────────────────
  .post("/:id/execution-complete", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "document:finalize", set);
    const doc = await import("../lib/prisma").then(m => m.prisma.rapidDocument.findUnique({ where: { id: params.id } }));
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    if (doc.status !== "finalized") { set.status = 409; return Errors.badRequest("Document must be finalized first"); }
    const updated = await import("../lib/prisma").then(m => m.prisma.rapidDocument.update({
      where: { id: params.id },
      data: { status: "execution_complete" },
    }));
    await createAuditLog(user.id, "execution_complete", "RapidDocument", params.id, { documentCode: updated.documentCode });
    return updated;
  })

  // ── POST /documents/:id/version ───────────────────────────────────────────
  .post("/:id/version", async ({ user, params, set }) => {
    requirePermission(user, "document:version", set);
    const result = await createDocumentVersion(params.id, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["finalized"]); }
    }
    set.status = 201;
    return result.document;
  })


  // ── PATCH /documents/:id — blocked for finalized documents ────────────────
  .patch("/:id", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "document:update", set);
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    if (doc.status === "finalized") {
      set.status = 403;
      return Errors.forbidden("Finalized documents are immutable and cannot be edited");
    }
    const allowed = ["draft", "needs_changes"];
    if (!allowed.includes(doc.status)) {
      set.status = 409;
      return Errors.invalidStatus(doc.status, allowed);
    }
    const updated = await prisma.rapidDocument.update({
      where: { id: params.id },
      data: _body as Record<string, unknown>,
      include: {
        createdBy: true,
        roleAssignments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        evidence: true,
        approvals: { include: { approver: { select: { id: true, name: true, email: true } } } },
      },
    });
    return updated;
  })

  // ── DELETE /documents/:id — Admin only, removes draft/corrupted docs ──────────
  .delete("/:id", async ({ user, params, set }: any) => {
    if (user.role !== "admin") { set.status = 403; return Errors.forbidden("Admin only"); }
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return Errors.notFound("Document"); }
    if (doc.status === "finalized" || doc.status === "execution_complete") { set.status = 403; return Errors.forbidden("Cannot delete finalized documents"); }
    await prisma.approval.deleteMany({ where: { documentId: params.id } });
    await prisma.roleAssignment.deleteMany({ where: { documentId: params.id } });
    await prisma.evidence.deleteMany({ where: { documentId: params.id } });
    await prisma.rapidDocument.delete({ where: { id: params.id } });
    set.status = 204;
    return null;
  })
  // ── POST /documents/:id/roles ─────────────────────────────────────────────
  .post("/:id/roles", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "role:assign", set);
    const parsed = parseBody(assignRoleSchema, _body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid role data", parsed.errors); }
    const result = await assignRole(params.id, parsed.data.roleType, parsed.data.userId, user.id);
    if (!result.ok) {
      if ("notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
      if ("invalidStatus" in result) { set.status = 409; return Errors.invalidStatus(result.invalidStatus ?? "unknown", ["draft", "needs_changes"]); }
    }
    set.status = 201;
    return result.assignment;
  })

  // ── POST /documents/:id/evidence ──────────────────────────────────────────
  .post("/:id/evidence", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "evidence:add", set);
    const parsed = parseBody(addEvidenceSchema, _body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid evidence data", parsed.errors); }
    const result = await addEvidence(params.id, parsed.data, user.id);
    if (!result.ok && "notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
    set.status = 201;
    return result.evidence;
  });