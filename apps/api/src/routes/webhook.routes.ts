import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { createLinearIssue } from "../services/linear.service";

export const webhookRoutes = new Elysia({ prefix: "/webhooks" })
  .use(authMiddleware)

  // POST /webhooks/linear/test — manually trigger Linear issue from a doc
  .post("/linear/trigger/:documentId", async ({ user, params, set }) => {
    requirePermission(user, "document:approve", set);
    const apiKey = process.env.LINEAR_API_KEY;
    const teamId = process.env.LINEAR_TEAM_ID;
    if (!apiKey || !teamId) {
      set.status = 500;
      return { error: "LINEAR_API_KEY or LINEAR_TEAM_ID not configured" };
    }
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.documentId } });
    if (!doc) { set.status = 404; return { error: "document not found" }; }

    const result = await createLinearIssue({
      title: `[RAPID] ${doc.documentCode}: ${doc.title}`,
      description: [
        `**Decision:** ${doc.decisionSummary}`,
        `**Risk Level:** ${doc.riskLevel}`,
        `**Status:** ${doc.status}`,
        `**Document Code:** ${doc.documentCode} v${doc.version}`,
        doc.businessContext ? `**Context:** ${doc.businessContext}` : "",
      ].filter(Boolean).join("\n\n"),
      teamId,
      apiKey,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "document_approved",
        entityType: "LinearIssue",
        entityId: result.issue?.id ?? "unknown",
        documentId: doc.id,
        details: JSON.stringify({ linearIssueId: result.issue?.id, url: result.issue?.url, identifier: result.issue?.identifier }),
      },
    });

    return { success: result.success, issue: result.issue };
  });

// Standalone function — call this from approval route on approve
export async function fireLinearWebhook(documentId: string, userId: string) {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;
  if (!apiKey || !teamId) return null;

  const doc = await prisma.rapidDocument.findUnique({ where: { id: documentId } });
  if (!doc) return null;

  try {
    const result = await createLinearIssue({
      title: `[RAPID] ${doc.documentCode}: ${doc.title}`,
      description: [
        `**Decision:** ${doc.decisionSummary}`,
        `**Risk Level:** ${doc.riskLevel}`,
        doc.businessContext ? `**Context:** ${doc.businessContext}` : "",
      ].filter(Boolean).join("\n\n"),
      teamId,
      apiKey,
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "document_approved",
        entityType: "LinearIssue",
        entityId: result.issue?.id ?? "unknown",
        documentId,
        details: JSON.stringify({ linearIssueId: result.issue?.id, url: result.issue?.url }),
      },
    });
    return result;
  } catch (e) {
    console.error("Linear webhook failed:", e);
    return null;
  }
}
