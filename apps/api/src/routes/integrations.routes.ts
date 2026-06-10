import { Elysia } from "elysia";
import crypto from 'crypto';
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { prisma } from "../lib/prisma";
import { notionSyncService } from "../services/notion.service";

export const integrationsRoutes = new Elysia({ prefix: "/integrations" })
  .use(authMiddleware)

  .post("/fathom/manual", async ({ user, body, set }) => {
    requirePermission(user, "document:approve", set);
    const { title, emails, transcript } = body as { title: string; emails: string[]; transcript: string };
    if (!title?.trim()) { set.status = 400; return { error: "title is required" }; }
    if (!emails?.length) { set.status = 400; return { error: "at least one email is required" }; }
    if (!transcript?.trim()) { set.status = 400; return { error: "transcript is required" }; }

    const COMPLYANCE_ORG_ID = "cmq2vwnsj0008j8lfjqanx4dz";
    const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

    const ensureUser = async (email: string) => {
      const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
      if (existing) return existing;
      return prisma.user.create({
        data: {
          email, name: email.split("@")[0],
          password: "manual_import_" + crypto.randomBytes(8).toString("hex"),
          role: "viewer", emailVerified: true, orgId: COMPLYANCE_ORG_ID,
        },
      });
    };

    const attendees = emails.map((email) => ({ email, name: email.split("@")[0] }));
    const users = await Promise.all(attendees.map((a) => ensureUser(a.email)));

    const attendeeList = attendees.map((a) => `${a.name} <${a.email}>`).join("\n");
    const rolePrompt = `You are analyzing a meeting transcript to assign RAPID decision-making framework roles.
RAPID roles: recommend, input, agree, decide, perform
Meeting attendees:\n${attendeeList}
Transcript:\n${transcript.slice(0, 4000)}
Assign exactly one RAPID role per person. Return ONLY valid JSON like {"email@domain.com": "recommend"}. No markdown.`;

    const decisionPrompt = `You are analyzing a compliance meeting transcript.
Attendees:\n${attendeeList}
Transcript:\n${transcript.slice(0, 4000)}
Extract and return ONLY valid JSON with keys: decisions (array), actions (array), owners (array), deadlines (array). No markdown.`;

    let aiRoles: Record<string, string> = {};
    let aiStructured = { decisions: [] as string[], actions: [] as string[], owners: [] as string[], deadlines: [] as string[] };

    try {
      const [r1, r2] = await Promise.all([
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 500, temperature: 0.1, messages: [{ role: "user", content: rolePrompt }] }),
        }),
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 800, temperature: 0.1, messages: [{ role: "user", content: decisionPrompt }] }),
        }),
      ]);
      const valid = ["recommend", "agree", "perform", "input", "decide"];
      const d1 = await r1.json() as any;
      const parsed1 = JSON.parse((d1.choices?.[0]?.message?.content ?? "{}").replace(/```json|```/g, "").trim());
      for (const [email, role] of Object.entries(parsed1)) {
        aiRoles[email] = valid.includes(role as string) ? (role as string) : "input";
      }
      const d2 = await r2.json() as any;
      const parsed2 = JSON.parse((d2.choices?.[0]?.message?.content ?? "{}").replace(/```json|```/g, "").trim());
      aiStructured = {
        decisions: Array.isArray(parsed2.decisions) ? parsed2.decisions : [],
        actions: Array.isArray(parsed2.actions) ? parsed2.actions : [],
        owners: Array.isArray(parsed2.owners) ? parsed2.owners : [],
        deadlines: Array.isArray(parsed2.deadlines) ? parsed2.deadlines : [],
      };
    } catch (e) {
      console.error("[Manual Import] Groq failed:", e);
      aiRoles = Object.fromEntries(attendees.map((a) => [a.email, "input"]));
    }

    const lastDoc = await prisma.rapidDocument.findFirst({
      where: { documentCode: { startsWith: "TRANSCRIPT-" } },
      orderBy: { documentCode: "desc" },
    });
    const lastNum = lastDoc ? parseInt(lastDoc.documentCode.replace("TRANSCRIPT-", ""), 10) || 0 : 0;
    const documentCode = `TRANSCRIPT-${String(lastNum + 1).padStart(3, "0")}-${crypto.randomBytes(3).toString("hex")}`;
    const docTitle = `[Transcript] ${title}`;

    const doc = await prisma.$transaction(async (tx) => {
      const document = await tx.rapidDocument.create({
        data: {
          title: docTitle, documentCode,
          decisionSummary: aiStructured.decisions.length ? aiStructured.decisions.join("\n") : transcript.slice(0, 500),
          businessContext: aiStructured.actions.length ? "Actions:\n" + aiStructured.actions.join("\n") + "\n\nOwners:\n" + aiStructured.owners.join("\n") : undefined,
          proposedDecision: aiStructured.deadlines.length ? "Deadlines:\n" + aiStructured.deadlines.join("\n") : undefined,
          transcriptContent: transcript,
          documentType: "TRANSCRIPT" as any,
          status: "awaiting_agreement" as any,
          createdById: users[0].id,
          orgId: COMPLYANCE_ORG_ID,
        },
      });
      await Promise.all(users.map((u, i) => {
        const email = attendees[i]?.email ?? u.email;
        const rapidRole = aiRoles[email] ?? aiRoles[email.toLowerCase()] ?? "input";
        return tx.roleAssignment.create({ data: { documentId: document.id, userId: u.id, roleType: rapidRole as any } });
      }));
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "transcript_imported" as any,
          entityType: "RapidDocument", entityId: document.id,
          details: JSON.stringify({ source: "manual_paste", meetingTitle: title, aiRoleAssignments: aiRoles, aiDecisions: aiStructured.decisions, importedAt: new Date().toISOString() }),
        },
      });
      return document;
    });

    return { ok: true, documentId: doc.id, documentCode: doc.documentCode, title: docTitle, participantCount: users.length, aiRoleAssignments: aiRoles };
  })

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
