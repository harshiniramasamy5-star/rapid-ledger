import { prisma } from "../lib/prisma";
import type { WebhookEvent, WebhookHandler, WebhookPayload } from "./webhookDispatcher";

interface NotionPage { id: string; }

const safe = (s: string | null | undefined, max = 2000): string => (s ?? "").slice(0, max);
const selectProp = (name: string | null | undefined) => name ? { select: { name } } : undefined;

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

    await prisma.rapidDocument.update({ where: { id: documentId }, data: { syncStatus: "PENDING" } });

    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      await prisma.rapidDocument.update({ where: { id: documentId }, data: { syncStatus: "FAILED" } });
      throw new Error("[NotionSync] Missing NOTION_API_KEY or NOTION_DATABASE_ID");
    }

    try {
      const approvalDate = (doc as any).finalizedAt?.toISOString() ?? doc.updatedAt?.toISOString() ?? new Date().toISOString();
      const evidenceLinks = doc.evidence.map((e: { title: string; urlOrPath: string }) => e.title + ": " + e.urlOrPath).join("\n");
      const parentRef = doc.parentDocument ? doc.parentDocument.documentCode + " — " + doc.parentDocument.title : "";
      const ownerName = doc.createdBy?.name ?? doc.createdBy?.email ?? "Unknown";

      const properties: Record<string, unknown> = {
        Title: { title: [{ text: { content: safe("[" + doc.documentCode + "] " + doc.title, 255) } }] },
        Organization: { rich_text: [{ text: { content: safe(doc.org?.name ?? "—") } }] },
        Owner: { rich_text: [{ text: { content: safe(ownerName) } }] },
        "Approval Date": { date: { start: approvalDate } },
        "Document Code": { rich_text: [{ text: { content: safe(doc.documentCode + " v" + doc.version) } }] },
        "Audit Reference": { rich_text: [{ text: { content: safe(documentId) } }] },
      };

      const statusProp = selectProp(doc.status);
      if (statusProp) properties["Status"] = statusProp;
      const docTypeProp = selectProp((doc as any).documentType ?? null);
      if (docTypeProp) properties["Document Type"] = docTypeProp;
      const riskProp = selectProp((doc as any).riskLevel ?? null);
      if (riskProp) properties["Risk Level"] = riskProp;
      if (parentRef) properties["Parent Document"] = { rich_text: [{ text: { content: safe(parentRef) } }] };
      if (evidenceLinks) properties["Evidence Links"] = { rich_text: [{ text: { content: safe(evidenceLinks) } }] };

      const children: unknown[] = [
        { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Decision Summary" } }] } },
        { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: safe(doc.decisionSummary) } }] } },
      ];
      if ((doc as any).businessContext) {
        children.push(
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Business Context" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: safe((doc as any).businessContext) } }] } }
        );
      }
      if ((doc as any).transcriptContent) {
        children.push(
          { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Transcript" } }] } },
          { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: safe((doc as any).transcriptContent) } }] } }
        );
      }

      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + notionApiKey,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({ parent: { database_id: notionDatabaseId }, properties, children }),
      });

      const responseText = await response.text();
      if (!response.ok) throw new Error("Notion API " + response.status + ": " + responseText);

      const page = JSON.parse(responseText) as NotionPage;

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
          orgId: (doc as any).orgId ?? undefined,
          details: JSON.stringify({ notionPageId: page.id, documentCode: doc.documentCode }),
        },
      });

      console.log("[NotionSync] Done: " + doc.documentCode + " → " + page.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[NotionSync] Failed: " + message);
      await prisma.rapidDocument.update({ where: { id: documentId }, data: { syncStatus: "FAILED" } });
      throw err;
    }
  }
}

export const notionSyncService = new NotionSyncService();
