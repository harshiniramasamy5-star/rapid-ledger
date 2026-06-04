import { prisma } from "../lib/prisma";
import type { WebhookEvent, WebhookHandler, WebhookPayload } from "./webhookDispatcher";

interface NotionPage {
  id: string;
}

export class NotionSyncService implements WebhookHandler {
  async handle(event: WebhookEvent, payload: WebhookPayload): Promise<void> {
    if (event !== "document.approved") return;
    await this.sync(payload.documentId, payload.userId);
  }

  async sync(documentId: string, userId: string): Promise<void> {
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: documentId },
      include: {
        createdBy: { select: { name: true, email: true } },
        org: { select: { name: true } },
        approvals: { include: { approver: { select: { name: true, email: true } } } },
        evidence: true,
        parentDocument: { select: { id: true, documentCode: true, title: true } },
      },
    });

    if (!doc) throw new Error("[NotionSync] Document " + documentId + " not found");

    await prisma.rapidDocument.update({
      where: { id: documentId },
      data: { syncStatus: "PENDING" },
    });

    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      console.warn("[NotionSync] NOTION_API_KEY or NOTION_DATABASE_ID not configured");
      await prisma.rapidDocument.update({
        where: { id: documentId },
        data: { syncStatus: "FAILED" },
      });
      return;
    }

    try {
      const approvalDate = doc.finalizedAt?.toISOString() ?? doc.updatedAt?.toISOString() ?? new Date().toISOString();
      const evidenceLinks = doc.evidence.map((e: { title: string; urlOrPath: string }) => e.title + ": " + e.urlOrPath).join("\n");
      const parentRef = doc.parentDocument ? doc.parentDocument.documentCode + " — " + doc.parentDocument.title : "";

      const pageBody = {
        parent: { database_id: notionDatabaseId },
        properties: {
          Title: { title: [{ text: { content: "[" + doc.documentCode + "] " + doc.title } }] },
          Organization: { rich_text: [{ text: { content: doc.org?.name ?? "—" } }] },
          Owner: { rich_text: [{ text: { content: doc.createdBy.name } }] },
          "Approval Date": { date: { start: approvalDate } },
          Status: { select: { name: doc.status } },
          "Document Type": { select: { name: doc.documentType } },
          "Risk Level": { select: { name: doc.riskLevel } },
          "Document Code": { rich_text: [{ text: { content: doc.documentCode + " v" + doc.version } }] },
          "Audit Reference": { rich_text: [{ text: { content: doc.id } }] },
          ...(parentRef ? { "Parent Document": { rich_text: [{ text: { content: parentRef } }] } } : {}),
          ...(evidenceLinks ? { "Evidence Links": { rich_text: [{ text: { content: evidenceLinks } }] } } : {}),
        },
        children: [
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Decision Summary" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: doc.decisionSummary } }] } },
          ...(doc.businessContext ? [
            { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Business Context" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: doc.businessContext } }] } },
          ] : []),
          ...(doc.transcriptContent ? [
            { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Transcript" } }] } },
            { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: doc.transcriptContent.slice(0, 2000) } }] } },
          ] : []),
        ],
      };

      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + notionApiKey,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify(pageBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error("Notion API " + response.status + ": " + errText);
      }

      const page = (await response.json()) as NotionPage;

      await prisma.rapidDocument.update({
        where: { id: documentId },
        data: { notionPageId: page.id, syncedAt: new Date(), syncStatus: "SYNCED" },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: "notion_synced",
          entityType: "RapidDocument",
          entityId: documentId,
          documentId,
          orgId: doc.orgId ?? undefined,
          details: JSON.stringify({ notionPageId: page.id, documentCode: doc.documentCode }),
        },
      });

      console.log("[NotionSync] Done: " + doc.documentCode);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[NotionSync] Failed: " + message);
      await prisma.rapidDocument.update({
        where: { id: documentId },
        data: { syncStatus: "FAILED" },
      });
      throw err;
    }
  }
}

export const notionSyncService = new NotionSyncService();
