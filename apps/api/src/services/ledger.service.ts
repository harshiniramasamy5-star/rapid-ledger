import { prisma } from "../lib/prisma";

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
      include: { roleAssignments: { include: { user: { select: { id: true, name: true } } } }, evidence: true, ledgerEntries: true },
    });
    const entry = await tx.ledgerEntry.create({
      data: { documentId, documentCode: doc.documentCode, version: doc.version, title: doc.title, finalizedBy: actorId, finalizedAt: now },
    });
    await tx.auditLog.create({ data: { userId: actorId, action: "document_finalized", entityType: "RapidDocument", entityId: documentId, details: { documentCode: doc.documentCode, version: doc.version, ledgerEntryId: entry.id } } });
    await tx.auditLog.create({ data: { userId: actorId, action: "ledger_entry_created", entityType: "LedgerEntry", entityId: entry.id, details: { documentId, documentCode: doc.documentCode, version: doc.version, title: doc.title } } });
    return { updated: result, ledgerEntry: entry };
  });

  return { ok: true as const, document: updated, ledgerEntry };
}

export async function getLedgerEntries(options?: { search?: string; limit?: number; offset?: number }) {
  const { search, limit = 100, offset = 0 } = options ?? {};
  return prisma.ledgerEntry.findMany({
    where: search ? { OR: [{ title: { contains: search, mode: "insensitive" } }] } : undefined,
    include: { document: { include: { roleAssignments: { include: { user: { select: { id: true, name: true, email: true } } } } } } },
    orderBy: { finalizedAt: "desc" }, take: limit, skip: offset,
  });
}

export async function exportLedgerCsv(): Promise<string> {
  const entries = await getLedgerEntries({ limit: 10000 });
  const rows = entries.map((e: { documentCode: string; version: number; title: string; finalizedBy: string; finalizedAt: Date }) => [e.documentCode, e.version, `"${e.title.replace(/"/g, '""')}"`, e.finalizedBy, e.finalizedAt.toISOString()].join(","));
  return ["documentCode,version,title,finalizedBy,finalizedAt", ...rows].join("\n");
}
