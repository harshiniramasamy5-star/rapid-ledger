import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

export const transcriptRoutes = new Elysia({ prefix: "/documents" })
  .use(authMiddleware)

  // POST /documents/:id/transcript — attach transcript text to a TRANSCRIPT-type doc
  .post("/:id/transcript", async ({ user, params, body, set }) => {
    requirePermission(user, "document:update", set);
    const { content, mediaUrl } = body as { content: string; mediaUrl?: string };
    if (!content) { set.status = 400; return { error: "transcript content required" }; }

    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return { error: "document not found" }; }
    if (doc.documentType !== "TRANSCRIPT") {
      set.status = 400;
      return { error: "only TRANSCRIPT-type documents can have transcripts attached" };
    }

    const updated = await prisma.rapidDocument.update({
      where: { id: params.id },
      data: {
        transcriptContent: content,
        mediaUrl: mediaUrl ?? doc.mediaUrl,
        transcriptUrl: `/documents/${params.id}/transcript/export`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "evidence_added",
        entityType: "RapidDocument",
        entityId: params.id,
        documentId: params.id,
        details: JSON.stringify({ type: "transcript", mediaUrl }),
      },
    });

    return { message: "transcript attached", documentId: params.id, transcriptUrl: updated.transcriptUrl };
  })

  // GET /documents/:id/transcript/export — export transcript as .txt
  .get("/:id/transcript/export", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const doc = await prisma.rapidDocument.findUnique({ where: { id: params.id } });
    if (!doc) { set.status = 404; return { error: "document not found" }; }
    if (!doc.transcriptContent) { set.status = 404; return { error: "no transcript attached" }; }

    const filename = `${doc.documentCode}-v${doc.version}-transcript.txt`;
    const txtContent = [
      `RAPID Ledger — Transcript Export`,
      `Document: ${doc.title} (${doc.documentCode} v${doc.version})`,
      `Exported: ${new Date().toISOString()}`,
      `${"=".repeat(60)}`,
      "",
      doc.transcriptContent,
    ].join("\n");

    set.headers = {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    };

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "transcript_exported",
        entityType: "RapidDocument",
        entityId: params.id,
        documentId: params.id,
        details: JSON.stringify({ filename, documentCode: doc.documentCode }),
      },
    });

    return txtContent;
  })

  // GET /documents/:id/transcript — get transcript metadata + preview
  .get("/:id/transcript", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: params.id },
      select: {
        id: true, documentCode: true, version: true, title: true,
        documentType: true, mediaUrl: true, transcriptUrl: true,
        transcriptContent: true, createdAt: true,
      },
    });
    if (!doc) { set.status = 404; return { error: "document not found" }; }
    if (!doc.transcriptContent) { set.status = 404; return { error: "no transcript attached" }; }
    return {
      documentId: doc.id,
      documentCode: doc.documentCode,
      title: doc.title,
      mediaUrl: doc.mediaUrl,
      transcriptUrl: doc.transcriptUrl,
      preview: doc.transcriptContent.slice(0, 300),
      charCount: doc.transcriptContent.length,
    };
  });
