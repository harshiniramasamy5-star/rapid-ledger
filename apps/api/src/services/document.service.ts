import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";
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

export interface ListDocumentsOptions {
  status?: DocumentStatus;
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
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.department ? { department: filters.department } : {}),
    ...(filters?.riskLevel ? { riskLevel: filters.riskLevel as "low" | "medium" | "high" | "critical" } : {}),
    ...(filters?.search ? { OR: [{ title: { contains: filters.search, mode: "insensitive" } }, { documentCode: { contains: filters.search, mode: "insensitive" } }] } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.rapidDocument.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, take: limit, skip }),
    prisma.rapidDocument.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

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

  const hasAgree = doc.roleAssignments.some((r: { roleType: string }) => r.roleType === "agree");
  const nextStatus: DocumentStatus = hasAgree ? "awaiting_agreement" : "approved";

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
    await tx.auditLog.create({ data: { userId: actorId, action: "document_submitted", entityType: "RapidDocument", entityId: documentId, details: { newStatus: nextStatus } } });
    return result;
  });
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
    await tx.auditLog.create({ data: { userId: approverId, action: "document_approved", entityType: "RapidDocument", entityId: documentId, details: { comment, allApproved } } });
    return result;
  });
  return { ok: true as const, document: updated };
}

export async function rejectDocument(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  await prisma.approval.updateMany({ where: { documentId, approverId }, data: { decision: "rejected", comment } });
  const updated = await prisma.rapidDocument.update({ where: { id: documentId }, data: { status: "rejected" }, include: INCLUDE });
  await createAuditLog(approverId, "document_rejected", "RapidDocument", documentId, { comment });
  return { ok: true as const, document: updated };
}

export async function requestChanges(documentId: string, approverId: string, comment?: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "awaiting_agreement") return { ok: false as const, invalidStatus: doc.status };
  await prisma.approval.updateMany({ where: { documentId, approverId }, data: { decision: "needs_changes", comment } });
  const updated = await prisma.rapidDocument.update({ where: { id: documentId }, data: { status: "needs_changes" }, include: INCLUDE });
  await createAuditLog(approverId, "document_needs_changes", "RapidDocument", documentId, { comment });
  return { ok: true as const, document: updated };
}

/** Fix 9: creates new version with SAME documentCode, version + 1, copies roles AND evidence */
export async function createDocumentVersion(documentId: string, actorId: string) {
  const original = await prisma.rapidDocument.findUnique({ where: { id: documentId }, include: { roleAssignments: true, evidence: true } });
  if (!original) return { ok: false as const, notFound: true };
  if (original.status !== "finalized" && original.status !== "execution_complete") return { ok: false as const, invalidStatus: original.status };

  const newDoc = await prisma.rapidDocument.create({
    data: {
      documentCode: original.documentCode,
      version: original.version + 1,
      title: original.title, decisionSummary: original.decisionSummary, riskLevel: original.riskLevel,
      complianceImpact: original.complianceImpact, department: original.department, deadline: original.deadline,
      businessContext: original.businessContext, problemStatement: original.problemStatement,
      proposedDecision: original.proposedDecision, alternativesConsidered: original.alternativesConsidered,
      createdById: original.createdById, status: "draft",
    },
    include: INCLUDE,
  });

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
