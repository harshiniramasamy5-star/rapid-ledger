import { prisma } from "../lib/prisma";
import { notifyNextStageIfUnlocked, ROLE_STAGE_ORDER } from "./document.service";

export async function finalizeDocument(documentId: string, actorId: string) {
  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, notFound: true };
  if (doc.status !== "approved") return { ok: false as const, invalidStatus: doc.status };

  const now = new Date();

  // Atomic: finalize status + ledger entry + both audit logs
  const { updated, ledgerEntry } = await prisma.$transaction(async (tx) => {
    const result = await tx.rapidDocument.update({
      where: { id: documentId },
      data: { status: "finalized", finalizedAt: now },
      include: { roleAssignments: { include: { user: { select: { id: true, name: true } } } }, evidence: true, ledgerEntries: true } });
    const entry = await tx.ledgerEntry.create({
      data: { documentId, documentCode: doc.documentCode, version: doc.version, title: doc.title, finalizedBy: actorId, finalizedAt: now } });
    await tx.roleAssignment.updateMany({ where: { documentId, roleType: "decide" }, data: { status: "completed", completedAt: now } });
    await tx.auditLog.create({ data: { userId: actorId, action: "document_finalized", entityType: "RapidDocument", entityId: documentId, details: JSON.stringify({ documentCode: doc.documentCode, version: doc.version, ledgerEntryId: entry.id }) } });
    await tx.auditLog.create({ data: { userId: actorId, action: "ledger_entry_created", entityType: "LedgerEntry", entityId: entry.id, details: JSON.stringify({ documentId, documentCode: doc.documentCode, version: doc.version, title: doc.title }) } });
    return { updated: result, ledgerEntry: entry };
  });
  await notifyNextStageIfUnlocked(documentId, ROLE_STAGE_ORDER.decide);

  return { ok: true as const, document: updated, ledgerEntry };
}

async function fetchLedgerEntries(options?: { search?: string; limit?: number; offset?: number }) {
  const { search, limit = 100, offset = 0 } = options ?? {};
  return prisma.ledgerEntry.findMany({
    where: search ? { OR: [{ title: { contains: search } }] } : undefined,
    include: { document: { include: { roleAssignments: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
    orderBy: { finalizedAt: "desc" }, take: limit, skip: offset });
}

export async function getLedgerEntries(options?: { search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = options?.search ? { OR: [{ title: { contains: options.search, mode: "insensitive" as const } }] } : undefined;
  const [data, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      include: { document: { include: { roleAssignments: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
      orderBy: { finalizedAt: "desc" }, take: limit, skip }),
    prisma.ledgerEntry.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function exportLedgerCsv(): Promise<string> {
  const entries = await fetchLedgerEntries({ limit: 10000 });
  const rows = entries.map((e: { documentCode: string; version: number; title: string; finalizedBy: string; finalizedAt: Date }) => [e.documentCode, e.version, `"${e.title.replace(/"/g, '""')}"`, e.finalizedBy, e.finalizedAt.toISOString()].join(","));
  return ["documentCode,version,title,finalizedBy,finalizedAt", ...rows].join("\n");
}
