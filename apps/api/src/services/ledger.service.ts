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
