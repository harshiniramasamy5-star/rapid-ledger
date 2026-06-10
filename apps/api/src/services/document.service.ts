import { prisma } from "../lib/prisma";
import type { Prisma, DocumentStatus } from "@prisma/client";
import { nextDocumentCode } from "../lib/documentCode";
import { validateDocument } from "./validation.service";
import { createAuditLog } from "./audit.service";
import type { CreateDocumentBody } from "../types";
import { webhookDispatcher } from "./webhookDispatcher";
import { notionSyncService } from "./notion.service";
import {
  sendApprovalNotificationEmail,
  sendRejectionNotificationEmail,
  sendChangesRequestedEmail,
} from "./email.service";

const INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  roleAssignments: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  evidence: true,
  approvals: { include: { approver: { select: { id: true, name: true, email: true } } } },
  ledgerEntries: true,
  auditLogs: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" as const }, take: 20 } } as const;

export interface ListDocumentsOptions {
  status?: string;
  department?: string;
  riskLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedDocuments {
  data: Awaited<ReturnType<typeof prisma.rapidDocument.findMany>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listDocuments(filters?: ListDocumentsOptions): Promise<PaginatedDocuments> {
  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.RapidDocumentWhereInput = {
    ...(filters?.status ? { status: filters.status as DocumentStatus } : {}),
    ...(filters?.department ? { department: filters.department } : {}),
    ...(filters?.riskLevel ? { riskLevel: filters.riskLevel as "low" | "medium" | "high" | "critical" } : {}),
    ...(filters?.search ? { OR: [{ title: { contains: filters.search, mode: "insensitive" } }, { documentCode: { contains: filters.search, mode: "insensitive" } }, { department: { contains: filters.search, mode: "insensitive" } }, { decisionSummary: { contains: filters.search, mode: "insensitive" } }] } : {}) };

  await checkAndUpdateSlaBreaches();
  const [data, total] = await Promise.all([
    prisma.rapidDocument.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, take: limit, skip }),
    prisma.rapidDocument.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export const getDocument = (id: string) => prisma.rapidDocument.findUnique({ where: { id }, include: INCLUDE });

export async function createDocument(body: CreateDocumentBody, createdById: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const documentCode = await nextDocumentCode();
    try {
      const doc = await prisma.rapidDocument.create({
        data: { documentCode, version: 1, title: body.title, decisionSummary: body.decisionSummary, riskLevel: body.riskLevel, complianceImpact: body.complianceImpact ?? false, department: body.department, deadline: body.deadline ? new Date(body.deadline) : undefined, businessContext: body.businessContext, problemStatement: body.problemStatement, proposedDecision: body.proposedDecision, alternativesConsidered: body.alternativesConsidered, createdById, status: "draft", documentType: (body.documentType as "RAPID" | "PORTAL" | "TRANSCRIPT") ?? "RAPID", visibility: (body.visibility as "PRIVATE" | "ORG" | "PUBLIC") ?? "PRIVATE", parentDocumentId: body.parentDocumentId ?? undefined },
        include: INCLUDE });
      await createAuditLog(createdById, "document_created", "RapidDocument", doc.id, { documentCode, title: body.title });
      return doc;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Failed to generate a unique document code after 5 attempts");
}

export async function submitDocument(documentId: string, actorId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true, evidence: true, approvals: true } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "draft" && doc.status !== "needs_changes") return { ok: false as const, invalidStatus: doc.status };

  const validation = validateDocument({ document: doc, roles: doc.roleAssignments, evidence: doc.evidence });
  if (!validation.valid) return { ok: false as const, validationErrors: validation.errors };

  const hasAgree = doc.roleAssignments.some((r: { roleType: string }) => r.roleType === "agree");
  const nextStatus = hasAgree ? "awaiting_agreement" : "approved";

  // Atomic: approval upserts + status update + audit log
  const updated = await prisma.$transaction(async (tx) => {
    if (hasAgree) {
      for (const a of doc.roleAssignments.filter((r: { roleType: string }) => r.roleType === "agree")) {
        const existing = await tx.approval.findFirst({ where: { documentId, approverId: a.userId } });
        if (existing) { await tx.approval.update({ where: { id: existing.id }, data: { decision: "pending", comment: null } }); }
        else { await tx.approval.create({ data: { documentId, approverId: a.userId, decision: "pending" } }); }
      }
    }
    const result = await tx.rapidDocument.update({ where: { id: documentId }, data: { status: nextStatus, submittedAt: new Date() }, include: INCLUDE });
    await tx.auditLog.create({ data: { userId: actorId, action: "document_submitted", entityType: "RapidDocument", entityId: documentId, details: JSON.stringify({ newStatus: nextStatus }) } });
    return result;
  });

  // Fire webhook when no agree role — doc goes draft → approved directly
  if (updated.status === "approved") {
    // Direct sync — guaranteed regardless of dispatcher handler registration timing,
    // mirroring approveDocument so both paths to "approved" reliably archive to Notion.
    try { await notionSyncService.sync(documentId, actorId); } catch (e) { console.error("[DirectSync] Notion sync failed (submit-direct):", e); }
    await webhookDispatcher.dispatch("document.approved", {
      documentId,
      userId: actorId,
      timestamp: new Date().toISOString(),
      data: { source: "submit-direct-approval" },
    });
  }

  return { ok: true as const, document: updated };
}

export async function approveDocument(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  // Atomic: approval update + optional status change + audit log
  const updated = await prisma.$transaction(async (tx) => {
    await tx.approval.updateMany({ where: { documentId, approverId }, data: { decision: "approved", comment } });
    const allApprovals = await tx.approval.findMany({ where: { documentId } });
    const allApproved = allApprovals.every((a: { decision: string }) => a.decision === "approved");
    const result = allApproved
      ? await tx.rapidDocument.update({ where: { id: documentId }, data: { status: "approved" }, include: INCLUDE })
      : await tx.rapidDocument.findUnique({ where: { id: documentId }, include: INCLUDE });
    await tx.auditLog.create({ data: { userId: approverId, action: "document_approved", entityType: "RapidDocument", entityId: documentId, details: JSON.stringify({ comment, allApproved }) } });
    return result;
  });
  // Fire webhook after transaction — only when doc fully transitions to approved
  if (updated?.status === "approved") {
    // Direct sync — guaranteed regardless of dispatcher handler registration timing
    try { await notionSyncService.sync(documentId, approverId); } catch (e) { console.error("[DirectSync] Notion sync failed:", e); }
    await webhookDispatcher.dispatch("document.approved", {
      documentId,
      userId: approverId,
      timestamp: new Date().toISOString(),
    });

    // Email notifications — submitter + assigned users
    try {
      const doc = await prisma.rapidDocument.findUnique({
        where: { id: documentId },
        include: {
          createdBy: { select: { name: true, email: true } },
          roleAssignments: { include: { user: { select: { name: true, email: true } } } },
          approvals: { include: { approver: { select: { name: true } } } },
        },
      });
      if (doc) {
        const approverName = doc.approvals.find((a: { approverId: string; approver: { name: string } }) => a.approverId === approverId)?.approver.name ?? "An approver";
        const recipients = new Set([doc.createdBy.email]);
        doc.roleAssignments.forEach((ra: { user: { email: string } }) => recipients.add(ra.user.email));
        await Promise.allSettled(
          [...recipients].map(email =>
            sendApprovalNotificationEmail(email, email.split("@")[0], doc.title, doc.documentCode, approverName)
          )
        );
      }
    } catch (e) { console.error("[DocService] Approval email failed:", e); }
  }

  return { ok: true as const, document: updated };
}

export async function rejectDocument(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  const updated = await prisma.$transaction(async (tx) => {
    await tx.approval.updateMany({ where: { documentId, approverId }, data: { decision: "rejected", comment } });
    const result = await tx.rapidDocument.update({ where: { id: documentId }, data: { status: "rejected" }, include: INCLUDE });
    await createAuditLog(approverId, "document_rejected", "RapidDocument", documentId, { comment }, tx);
    return result;
  });
  // Email notifications on rejection
  if (updated) {
    try {
      const rejectDoc = await prisma.rapidDocument.findUnique({
        where: { id: documentId },
        include: {
          createdBy: { select: { name: true, email: true } },
          roleAssignments: { include: { user: { select: { name: true, email: true } } } },
          approvals: { include: { approver: { select: { name: true } } } },
        },
      });
      if (rejectDoc) {
        const approverName = rejectDoc.approvals.find((a: { approverId: string; approver: { name: string } }) => a.approverId === approverId)?.approver.name ?? "An approver";
        const recipients = new Set([rejectDoc.createdBy.email]);
        rejectDoc.roleAssignments.forEach((ra: { user: { email: string } }) => recipients.add(ra.user.email));
        await Promise.allSettled(
          [...recipients].map(email =>
            sendRejectionNotificationEmail(email, email.split("@")[0], rejectDoc.title, rejectDoc.documentCode, approverName, comment)
          )
        );
      }
    } catch (e) { console.error("[DocService] Rejection email failed:", e); }
  }
  return { ok: true as const, document: updated };
}

export async function requestChanges(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  const updated = await prisma.$transaction(async (tx) => {
    await tx.approval.updateMany({ where: { documentId, approverId }, data: { decision: "needs_changes", comment } });
    const result = await tx.rapidDocument.update({ where: { id: documentId }, data: { status: "needs_changes" }, include: INCLUDE });
    await createAuditLog(approverId, "document_needs_changes", "RapidDocument", documentId, { comment }, tx);
    return result;
  });
  // Email notifications on changes requested
  if (updated) {
    try {
      const changesDoc = await prisma.rapidDocument.findUnique({
        where: { id: documentId },
        include: {
          createdBy: { select: { name: true, email: true } },
          roleAssignments: { include: { user: { select: { name: true, email: true } } } },
          approvals: { include: { approver: { select: { name: true } } } },
        },
      });
      if (changesDoc) {
        const reviewerName = changesDoc.approvals.find((a: { approverId: string; approver: { name: string } }) => a.approverId === approverId)?.approver.name ?? "A reviewer";
        const recipients = new Set([changesDoc.createdBy.email]);
        changesDoc.roleAssignments.forEach((ra: { user: { email: string } }) => recipients.add(ra.user.email));
        await Promise.allSettled(
          [...recipients].map(email =>
            sendChangesRequestedEmail(email, email.split("@")[0], changesDoc.title, changesDoc.documentCode, reviewerName, comment)
          )
        );
      }
    } catch (e) { console.error("[DocService] Changes-requested email failed:", e); }
  }
  return { ok: true as const, document: updated };
}

/** Fix 9: creates new version with SAME documentCode, version + 1, copies roles AND evidence */
export async function createDocumentVersion(documentId: string, actorId: string) {
  const original = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true, evidence: true } });
  if (!original) return { ok: false as const, notFound: true };
  if (original.status !== "finalized" && original.status !== "execution_complete") return { ok: false as const, invalidStatus: original.status };

  // ── Self-healing: wipe any stuck (non-finalized) prior version attempts of this documentCode ──
  const stuckVersions = await prisma.rapidDocument.findMany({
    where: {
      documentCode: original.documentCode,
      status: { notIn: ["finalized", "execution_complete"] },
      id: { not: original.id } },
    select: { id: true } });
  for (const stuck of stuckVersions) {
    await prisma.approval.deleteMany({ where: { documentId: stuck.id } });
    await prisma.roleAssignment.deleteMany({ where: { documentId: stuck.id } });
    await prisma.evidence.deleteMany({ where: { documentId: stuck.id } });
    await prisma.rapidDocument.delete({ where: { id: stuck.id } });
  }

  // Find the next available version number (avoid unique constraint collision)
  const existingVersions = await prisma.rapidDocument.findMany({
    where: { documentCode: original.documentCode },
    select: { version: true } });
  const usedVersions = new Set(existingVersions.map(d => d.version));
  let nextVersion = original.version + 1;
  while (usedVersions.has(nextVersion)) nextVersion++;

  const newDoc = await prisma.rapidDocument.create({
    data: {
      documentCode: original.documentCode,
      version: nextVersion,
      title: original.title, decisionSummary: original.decisionSummary, riskLevel: original.riskLevel,
      complianceImpact: original.complianceImpact, department: original.department, deadline: original.deadline,
      businessContext: original.businessContext, problemStatement: original.problemStatement,
      proposedDecision: original.proposedDecision, alternativesConsidered: original.alternativesConsidered,
      createdById: original.createdById, status: "draft" },
    include: INCLUDE });

  for (const role of original.roleAssignments) {
    await prisma.roleAssignment.create({ data: { documentId: newDoc.id, roleType: role.roleType, userId: role.userId } });
  }

  for (const ev of original.evidence) {
    await prisma.evidence.create({ data: { documentId: newDoc.id, type: ev.type, title: ev.title, urlOrPath: ev.urlOrPath, description: ev.description, uploadedBy: ev.uploadedBy } });
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
  const evidence = await prisma.evidence.create({ data: { documentId, type: data.type, title: data.title, urlOrPath: data.urlOrPath ?? "", description: data.description, uploadedBy: actorId } });
  await createAuditLog(actorId, "evidence_added", "Evidence", evidence.id, { documentId });
  return { ok: true as const, evidence };
}

export async function runValidation(documentId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true, evidence: true } });
  if (!doc) return null;
  return validateDocument({ document: doc, roles: doc.roleAssignments, evidence: doc.evidence });
}

export async function checkAndUpdateSlaBreaches() {
  const now = new Date();
  const result = await prisma.rapidDocument.updateMany({
    where: {
      deadline: { lt: now },
      status: { notIn: ["finalized", "execution_complete"] },
      slaBreached: false,
    },
    data: { slaBreached: true },
  });
  return result.count;
}
