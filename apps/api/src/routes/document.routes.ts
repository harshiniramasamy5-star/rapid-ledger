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
import { Errors } from "../lib/errors";
import { finalizeDocument } from "../services/ledger.service";
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
    const parsed = parseBody(approvalSchema, body ?? {});
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
    const parsed = parseBody(approvalSchema, body ?? {});
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
    const parsed = parseBody(approvalSchema, body ?? {});
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

  // ── POST /documents/:id/roles ─────────────────────────────────────────────
  .post("/:id/roles", async ({ user, params, body: _body, set }) => {
    requirePermission(user, "role:assign", set);
    const parsed = parseBody(assignRoleSchema, body);
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
    const parsed = parseBody(addEvidenceSchema, body);
    if (!parsed.ok) { set.status = 400; return Errors.badRequest("Invalid evidence data", parsed.errors); }
    const result = await addEvidence(params.id, parsed.data, user.id);
    if (!result.ok && "notFound" in result) { set.status = 404; return Errors.notFound("Document"); }
    set.status = 201;
    return result.evidence;
  });