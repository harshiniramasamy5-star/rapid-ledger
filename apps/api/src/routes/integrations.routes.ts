import { Elysia } from "elysia";
import crypto from 'crypto';
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
  })

  .get("/fathom/meetings", async ({ user, set }) => {
    requirePermission(user, "document:approve", set);
    const apiKey = process.env.FATHOM_API_KEY ?? '';
    if (!apiKey) { set.status = 503; return { error: 'FATHOM_API_KEY not configured' }; }
    try {
      const res = await fetch('https://api.fathom.ai/external/v1/meetings?limit=30', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) { set.status = 502; return { error: `Fathom API error: ${res.status}` }; }
      const data = await res.json() as any;
      const meetings = (data.results ?? data.meetings ?? data ?? []).map((m: any) => ({
        id: m.id,
        title: m.title ?? '(untitled)',
        startedAt: m.started_at ?? m.created_at,
        duration: m.duration_seconds,
        participants: m.attendees?.length ?? 0,
        hasTranscript: Boolean(m.transcript || m.has_transcript),
        isRapid: (m.title ?? '').startsWith('[RAPID]'),
        url: m.url ?? m.video_url,
      }));
      return { meetings };
    } catch (e) {
      set.status = 500;
      return { error: String(e) };
    }
  })

  .post("/fathom/import/:meetingId", async ({ user, params, set }) => {
    requirePermission(user, "document:approve", set);
    const apiKey = process.env.FATHOM_API_KEY ?? '';
    if (!apiKey) { set.status = 503; return { error: 'FATHOM_API_KEY not configured' }; }
    try {
      const res = await fetch(`https://api.fathom.ai/external/v1/meetings/${params.meetingId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) { set.status = 502; return { error: `Fathom API error: ${res.status}` }; }
      const m = await res.json() as any;
      const transcript: string = m.transcript ?? '';
      if (!transcript) { set.status = 400; return { error: 'No transcript available for this meeting' }; }

      const attendees: Array<{ email: string; name: string }> = (m.attendees ?? []).map((a: any) => ({
        email: a.email ?? '',
        name: a.name ?? a.email ?? 'Unknown',
      })).filter((a: any) => a.email);

      const COMPLYANCE_ORG_ID = 'cmq2vwnsj0008j8lfjqanx4dz';
      const ensureUser = async (email: string, name: string) => {
        const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (existing) return existing;
        return prisma.user.create({
          data: {
            email, name: name || email.split('@')[0],
            password: 'manual_import_' + crypto.randomBytes(8).toString('hex'),
            role: 'viewer', emailVerified: true, orgId: COMPLYANCE_ORG_ID,
          },
        });
      };

      const users = attendees.length > 0
        ? await Promise.all(attendees.map(a => ensureUser(a.email, a.name)))
        : [await prisma.user.findUniqueOrThrow({ where: { id: user.id } })];

      const docCount = await prisma.rapidDocument.count();
      const documentCode = `TRANSCRIPT-${String(docCount + 1).padStart(3, '0')}`;
      const title = `[Transcript] ${m.title ?? 'Manual Import'}`;

      const doc = await prisma.$transaction(async (tx) => {
        const document = await tx.rapidDocument.create({
          data: {
            title, documentCode,
            decisionSummary: m.summary ?? transcript.slice(0, 500),
            transcriptContent: transcript,
            documentType: 'TRANSCRIPT' as any,
            status: 'awaiting_agreement' as any,
            createdById: users[0].id,
            orgId: COMPLYANCE_ORG_ID,
          },
        });
        await Promise.all(users.map((u) =>
          tx.roleAssignment.create({
            data: { documentId: document.id, userId: u.id, roleType: 'input' as any },
          })
        ));
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'transcript_imported' as any,
            entityType: 'RapidDocument',
            entityId: document.id,
            details: JSON.stringify({
              source: 'manual_import',
              fathomMeetingId: params.meetingId,
              meetingTitle: m.title,
              importedAt: new Date().toISOString(),
            }),
          },
        });
        return document;
      });

      return { ok: true, documentId: doc.id, documentCode: doc.documentCode, title };
    } catch (e) {
      set.status = 500;
      return { error: String(e) };
    }
  })

  .post("/notion/resync/:documentId", async ({ user, params, set }) => {
    requirePermission(user, "document:approve", set);
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true, documentCode: true, status: true, syncStatus: true, notionPageId: true },
    });
    if (!doc) { set.status = 404; return { error: "document not found" }; }
    if (doc.status !== "approved" && doc.status !== "finalized" && doc.status !== "execution_complete") {
      set.status = 400;
      return { error: "document must be approved, finalized, or execution_complete to resync" };
    }
    await prisma.rapidDocument.update({ where: { id: params.documentId }, data: { syncStatus: "PENDING" } });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "webhook_retried",
        entityType: "RapidDocument",
        entityId: params.documentId,
        documentId: params.documentId,
        details: JSON.stringify({ previousNotionPageId: doc.notionPageId }),
      },
    });
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
  });
