import { prisma } from "../lib/prisma";
import type { AuditAction } from "@prisma/client";

export type AuditDetails = Record<string, unknown>;

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// Best-effort resolution of which workspace an audit event belongs to, so the
// admin "view user activity logs" feature can actually filter by workspace.
// Most call sites never had an orgId handy, so instead of threading it through
// every createAuditLog() call, we derive it here from whatever document
// reference is already on the event.
async function resolveOrgId(objectType: string, objectId: string, details: AuditDetails | undefined, client: TxClient | typeof prisma): Promise<string | undefined> {
  try {
    const documentId = objectType === "RapidDocument" ? objectId : (details?.documentId as string | undefined);
    if (!documentId) return undefined;
    const doc = await client.rapidDocument.findUnique({ where: { id: documentId }, select: { orgId: true } });
    return doc?.orgId ?? undefined;
  } catch {
    return undefined;
  }
}

export async function createAuditLog(
  actorId: string,
  action: string,
  objectType: string,
  objectId: string,
  details?: AuditDetails,
  tx?: TxClient,
): Promise<void> {
  const client = tx ?? prisma;
  try {
    const orgId = await resolveOrgId(objectType, objectId, details, client);
    await client.auditLog.create({
      data: {
        userId: actorId,
        action: action as AuditAction,
        entityType: objectType,
        entityId: objectId,
        details: details ? JSON.stringify(details) : undefined,
        orgId,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

export async function getAuditLogs(
  actorId?: string,
  objectType?: string,
  objectId?: string,
  action?: string,
  orgId?: string,
) {
  return prisma.auditLog.findMany({
    where: {
      ...(actorId    ? { userId: actorId }        : {}),
      ...(objectType ? { entityType: objectType } : {}),
      ...(objectId   ? { entityId: objectId }     : {}),
      ...(action     ? { action: action as AuditAction } : {}),
      ...(orgId      ? { orgId }                  : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
