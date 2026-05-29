import type { AuditAction } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type AuditDetails = Record<string, unknown>;

export async function createAuditLog(
  actorId: string,
  action: AuditAction,
  objectType: string,
  objectId: string,
  details?: AuditDetails,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action,
        entityType: objectType,
        entityId: objectId,
        details: details ? (details as import("@prisma/client").Prisma.InputJsonValue) : undefined,
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
) {
  return prisma.auditLog.findMany({
    where: {
      ...(actorId    ? { userId: actorId }        : {}),
      ...(objectType ? { entityType: objectType } : {}),
      ...(objectId   ? { entityId: objectId }     : {}),
      ...(action     ? { action: action as AuditAction } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
