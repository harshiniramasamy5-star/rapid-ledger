import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { createLinearIssue } from "../services/linear.service";
import { webhookDispatcher } from "../services/webhookDispatcher";

// Linear is optional — only active if LINEAR_API_KEY + LINEAR_TEAM_ID are set.
// It is NOT the primary destination for approved documents (Notion is).
export const linearWebhookHandler = {
  async handle(_event: string, payload: { documentId: string; userId: string }) {
    const apiKey = process.env.LINEAR_API_KEY;
    const teamId = process.env.LINEAR_TEAM_ID;
    if (!apiKey || !teamId) return;

    const doc = await prisma.rapidDocument.findUnique({ where: { id: payload.documentId } });
    if (!doc) return;

    try {
      const result = await createLinearIssue({
        title: "[RAPID] " + doc.documentCode + ": " + doc.title,
        description: [
          "**Decision:** " + doc.decisionSummary,
          "**Risk Level:** " + doc.riskLevel,
          "**Status:** " + doc.status,
          doc.businessContext ? "**Context:** " + doc.businessContext : "",
        ].filter(Boolean).join("\n\n"),
        teamId,
        apiKey,
      });

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "document_approved",
          entityType: "LinearIssue",
          entityId: result.issue?.id ?? "unknown",
          documentId: doc.id,
          details: JSON.stringify({ linearIssueId: result.issue?.id, url: result.issue?.url }),
        },
      });
    } catch (e) {
      console.error("[LinearWebhook] Failed:", e);
    }
  },
};

export const webhookRoutes = new Elysia({ prefix: "/webhooks" })
  .use(authMiddleware)

  // Manual Linear trigger — optional engineering integration only
  .post("/linear/trigger/:documentId", async ({ user, params, set }) => {
    requirePermission(user, "document:approve", set);
    await webhookDispatcher.dispatch("document.approved", {
      documentId: params.documentId,
      userId: user.id,
      timestamp: new Date().toISOString(),
      data: { source: "manual-linear-trigger" },
    });
    return { message: "Webhook dispatched", documentId: params.documentId };
  });
