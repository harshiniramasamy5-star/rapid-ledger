import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { prisma } from "../lib/prisma";
import { notionSyncService } from "../services/notion.service";

export const integrationsRoutes = new Elysia({ prefix: "/integrations" })
  .use(authMiddleware)

  .post("/notion/connect", async ({ user, set }) => {
    requirePermission(user, "document:approve", set);
    const configured = Boolean(process.env.NOTION_API_KEY) && Boolean(process.env.NOTION_DATABASE_ID);
    return {
      connected: configured,
      notionDatabaseId: process.env.NOTION_DATABASE_ID ?? null,
      message: configured
        ? "Notion integration is active. Approved documents will sync automatically."
        : "Set NOTION_API_KEY and NOTION_DATABASE_ID as environment variables on Railway to activate Notion sync.",
    };
  })

  .post("/notion/sync/:documentId", async ({ user, params, set }) => {
    requirePermission(user, "document:approve", set);
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true, documentCode: true, status: true, syncStatus: true },
    });
    if (!doc) { set.status = 404; return { error: "document not found" }; }
    if (doc.status !== "approved" && doc.status !== "finalized" && doc.status !== "execution_complete") {
      set.status = 400;
      return { error: "document must be approved, finalized, or execution_complete to sync" };
    }
    let syncError: string | null = null;
    try {
      await notionSyncService.sync(params.documentId, user.id);
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
    }
    const updated = await prisma.rapidDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true, documentCode: true, syncStatus: true, notionPageId: true, syncedAt: true },
    });
    return { ...updated, ...(syncError ? { syncError } : {}) };
  })

  .get("/notion/status/:documentId", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true, documentCode: true, title: true, status: true, syncStatus: true, notionPageId: true, syncedAt: true },
    });
    if (!doc) { set.status = 404; return { error: "document not found" }; }
    return {
      ...doc,
      notionConfigured: Boolean(process.env.NOTION_API_KEY) && Boolean(process.env.NOTION_DATABASE_ID),
      notionDatabaseId: process.env.NOTION_DATABASE_ID ?? null,
    };
  });
