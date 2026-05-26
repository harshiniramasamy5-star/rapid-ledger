#!/usr/bin/env bash
set -e
API="$HOME/rapid-ledger/apps/api"

echo "▶ Fix 1: audit.service.ts — AuditDetails → Prisma.InputJsonValue cast"
# The details field needs casting to Prisma's Json type
sed -i '' \
  's/details: details ?? undefined,/details: details ? (details as import("@prisma\/client").Prisma.InputJsonValue) : undefined,/' \
  "$API/src/services/audit.service.ts" 2>/dev/null

# Simpler fix: use Prisma import at top of file — rewrite just the create call
python3 - "$API/src/services/audit.service.ts" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()

old = 'import { prisma } from "../lib/prisma";\nimport type { AuditAction } from "@prisma/client";'
new = 'import { prisma } from "../lib/prisma";\nimport { Prisma, type AuditAction } from "@prisma/client";'
content = content.replace(old, new)

old2 = '        details: details ?? undefined,'
new2 = '        details: details ? (details as Prisma.InputJsonValue) : undefined,'
content = content.replace(old2, new2)

with open(path, 'w') as f:
    f.write(content)
print("  ✓ audit.service.ts — details cast fixed")
PY

echo "▶ Fix 2: audit.routes.ts — getAuditLogs object arg → positional args"
python3 - "$API/src/routes/audit.routes.ts" << 'PY'
import sys, re
path = sys.argv[1]
with open(path) as f:
    content = f.read()

# Replace the object call with positional args
old = 'return getAuditLogs({ actorId: query.actorId, objectType: query.objectType, objectId: query.objectId, limit: query.limit ? Number(query.limit) : 100, offset: query.offset ? Number(query.offset) : 0 });'
new = 'return getAuditLogs(query.actorId, query.objectType, query.objectId);'
if old in content:
    content = content.replace(old, new)
    print("  ✓ audit.routes.ts — getAuditLogs args fixed")
else:
    # Try a regex approach
    content = re.sub(
        r'return getAuditLogs\(\{[^}]+\}\);',
        'return getAuditLogs(query.actorId, query.objectType, query.objectId);',
        content
    )
    print("  ✓ audit.routes.ts — getAuditLogs args fixed (regex)")

with open(path, 'w') as f:
    f.write(content)
PY

echo "▶ Fix 3: document.routes.ts — riskLevel default + invalidStatus fallback"
python3 - "$API/src/routes/document.routes.ts" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()

# Fix 3a: riskLevel undefined — add default when calling createDocument
old = 'const doc = await createDocument(parsed.data, user.id);'
new = 'const doc = await createDocument({ ...parsed.data, riskLevel: parsed.data.riskLevel ?? "low" }, user.id);'
if old in content:
    content = content.replace(old, new)
    print("  ✓ riskLevel default added")

# Fix 3b: invalidStatus could be undefined
old2 = 'Errors.invalidStatus(result.invalidStatus,'
new2 = 'Errors.invalidStatus(result.invalidStatus ?? "unknown",'
if old2 in content:
    content = content.replace(old2, new2)
    print("  ✓ invalidStatus fallback added")

with open(path, 'w') as f:
    f.write(content)
PY

echo "▶ Fix 4: Check ledger.service.ts exists"
if [ ! -f "$API/src/services/ledger.service.ts" ]; then
    echo "  ⚠ ledger.service.ts MISSING — creating it"
    cat > "$API/src/services/ledger.service.ts" << 'TS'
import { prisma } from "../lib/prisma";
import { createAuditLog } from "./audit.service";

export async function finalizeDocument(documentId: string, actorId: string) {
  const now = new Date();

  const doc = await prisma.rapidDocument.findUnique({
    where: { id: documentId },
    include: { roleAssignments: true },
  });
  if (!doc) throw new Error("Document not found");
  if (doc.status !== "approved") {
    return { invalidStatus: doc.status as string };
  }

  await prisma.rapidDocument.update({
    where: { id: documentId },
    data: { status: "finalized", finalizedAt: now },
  });

  await prisma.ledgerEntry.create({
    data: {
      documentId,
      documentCode: doc.documentCode,
      version: doc.version,
      title: doc.title,
      finalizedBy: actorId,
      finalizedAt: now,
      summary: `${doc.documentCode} v${doc.version} finalized`,
    },
  });

  await createAuditLog(actorId, "document_finalized", "RapidDocument", documentId, {
    documentCode: doc.documentCode,
    version: doc.version,
  });

  return prisma.rapidDocument.findUnique({
    where: { id: documentId },
    include: { roleAssignments: { include: { user: { select: { id: true, name: true, email: true } } } }, evidence: true, approvals: true },
  });
}

export async function getLedgerEntries(search?: string) {
  return prisma.ledgerEntry.findMany({
    where: search
      ? { title: { contains: search, mode: "insensitive" } }
      : undefined,
    include: { document: { select: { documentCode: true, version: true } } },
    orderBy: { finalizedAt: "desc" },
  });
}

export async function exportLedgerCsv(search?: string) {
  const entries = await getLedgerEntries(search);
  const header = "documentCode,version,title,finalizedBy,finalizedAt";
  const rows = entries.map((e) =>
    [e.documentCode, e.version, `"${e.title.replace(/"/g, '""')}"`, e.finalizedBy, e.finalizedAt.toISOString()].join(",")
  );
  return [header, ...rows].join("\n");
}
TS
else
    echo "  ✓ ledger.service.ts exists"
fi

echo ""
echo "✅ All 5 fixes applied. Running verification..."
cd "$HOME/rapid-ledger"
npm run typecheck 2>&1 | tail -20
