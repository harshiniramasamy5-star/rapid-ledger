import type { WebhookHandler, WebhookEvent, WebhookPayload } from "./webhookDispatcher";
import { createLinearIssue } from "./linear.service";
import { prisma } from "../lib/prisma";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY ?? "";
// Sprint priority matrix: ENG team for document approvals
const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID ?? "323aba20-10bf-4268-ba25-0bb669c6a13b";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Linear] Attempt ${attempt}/${retries} failed, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error("unreachable");
}

export class LinearWebhookHandler implements WebhookHandler {
  async handle(event: WebhookEvent, payload: WebhookPayload): Promise<void> {
    if (event !== "document.approved") return;
    if (!LINEAR_API_KEY) {
      console.log("[Linear] LINEAR_API_KEY not set — skipping Linear issue creation");
      return;
    }

    const doc = await prisma.rapidDocument.findUnique({
      where: { id: payload.documentId },
      include: {
        createdBy: { select: { name: true, email: true } },
        roleAssignments: { include: { user: { select: { name: true, email: true, role: true } } } },
      },
    });

    if (!doc) {
      console.warn("[Linear] Document not found:", payload.documentId);
      return;
    }

    const deciders = doc.roleAssignments
      .filter(ra => ra.roleType === "decide")
      .map(ra => `${ra.user.name} (${ra.user.email})`)
      .join(", ");

    const performers = doc.roleAssignments
      .filter(ra => ra.roleType === "perform")
      .map(ra => `${ra.user.name} (${ra.user.email})`)
      .join(", ");

    const title = `[RAPID Approved] ${doc.documentCode}: ${doc.title}`;
    const description = [
      `## Document Approved — ${doc.documentCode}`,
      ``,
      `**Title:** ${doc.title}`,
      `**Risk Level:** ${doc.riskLevel}`,
      `**Department:** ${doc.department ?? "N/A"}`,
      `**Approved At:** ${new Date(payload.timestamp).toISOString()}`,
      ``,
      `### Decision Summary`,
      doc.decisionSummary ?? "No summary provided.",
      ``,
      `### RAPID Roles`,
      `- **Decider(s):** ${deciders || "N/A"}`,
      `- **Performer(s):** ${performers || "N/A"}`,
      `- **Submitted by:** ${doc.createdBy.name} (${doc.createdBy.email})`,
      ``,
      `### Audit Reference`,
      `Document ID: \`${doc.id}\``,
      `Approved by user: \`${payload.userId}\``,
      ``,
      `> This issue was auto-created by RAPID Ledger on document approval.`,
    ].join("\n");

    try {
      const result = await withRetry(() =>
        createLinearIssue({
          title,
          description,
          teamId: LINEAR_TEAM_ID,
          apiKey: LINEAR_API_KEY,
        })
      );

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "webhook_retried",
          entityType: "RapidDocument",
          entityId: payload.documentId,
          documentId: payload.documentId,
          details: JSON.stringify({
            integration: "linear",
            issueId: result.issue.id,
            issueUrl: result.issue.url,
            issueIdentifier: result.issue.identifier,
          }),
        },
      });

      console.log(`[Linear] Issue created: ${result.issue.identifier} — ${result.issue.url}`);
    } catch (err) {
      console.error("[Linear] Failed to create issue after retries:", err);
      // Log failure but don't throw — other handlers should still run
      try {
        await prisma.auditLog.create({
          data: {
            userId: payload.userId,
            action: "webhook_failed",
            entityType: "RapidDocument",
            entityId: payload.documentId,
            documentId: payload.documentId,
            details: JSON.stringify({
              integration: "linear",
              error: String(err),
              timestamp: new Date().toISOString(),
            }),
          },
        });
      } catch (_) {}
    }
  }
}

export const linearWebhookHandler = new LinearWebhookHandler();
