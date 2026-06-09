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


  // GET /documents/:id/export?format=txt — sprint-spec canonical export endpoint
  .get("/:id/export", async ({ user, params, query, set }) => {
    const fmt = (query as { format?: string }).format ?? "txt";
    if (fmt !== "txt") { set.status = 400; return { error: "only format=txt supported" }; }
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
        details: JSON.stringify({ filename, documentCode: doc.documentCode, format: "txt" }),
      },
    });

    return txtContent;
  })

  // GET /documents/:id/export-pdf — branded PDF export
  .get("/:id/export-pdf", async ({ user, params, set }) => {
    requirePermission(user, "document:read", set);
    const doc = await prisma.rapidDocument.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        roleAssignments: { include: { user: { select: { name: true, email: true } } } },
        approvals: { include: { approver: { select: { name: true } } } },
      },
    });
    if (!doc) { set.status = 404; return { error: "document not found" }; }

    const PDFDocument = (await import("pdfkit")).default;
    const chunks: Buffer[] = [];
    const pdf = new PDFDocument({ margin: 50, size: "A4" });
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      pdf.on("end", resolve);

      // Header bar
      pdf.rect(0, 0, pdf.page.width, 8).fill("#6366f1");

      // Logo + title
      pdf.moveDown(0.5);
      pdf.fontSize(20).fillColor("#0f172a").font("Helvetica-Bold")
        .text("RAPID Ledger", 50, 30);
      pdf.fontSize(9).fillColor("#6366f1").font("Helvetica")
        .text("Compliance Decision Record", 50, 54);

      // Document code badge area
      pdf.rect(50, 72, pdf.page.width - 100, 36).fill("#f8fafc").stroke("#e2e8f0");
      pdf.fontSize(11).fillColor("#6366f1").font("Helvetica-Bold")
        .text(doc.documentCode, 60, 82);
      pdf.fontSize(9).fillColor("#64748b").font("Helvetica")
        .text(`v${doc.version}  •  ${doc.status.replace(/_/g," ").toUpperCase()}  •  ${doc.riskLevel.toUpperCase()} RISK`, 130, 84);
      pdf.fontSize(9).fillColor("#64748b")
        .text(`Exported: ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}`, pdf.page.width - 200, 84);

      pdf.moveDown(2.5);

      // Title
      pdf.fontSize(16).fillColor("#0f172a").font("Helvetica-Bold")
        .text(doc.title, 50, pdf.y);
      pdf.moveDown(0.3);
      pdf.moveTo(50, pdf.y).lineTo(pdf.page.width - 50, pdf.y).stroke("#e2e8f0");
      pdf.moveDown(0.5);

      // Section helper
      const section = (label: string) => {
        pdf.moveDown(0.4);
        pdf.fontSize(8).fillColor("#6366f1").font("Helvetica-Bold")
          .text(label.toUpperCase(), 50, pdf.y, { characterSpacing: 1 });
        pdf.moveDown(0.2);
      };

      const body = (text: string) => {
        pdf.fontSize(10).fillColor("#334155").font("Helvetica")
          .text(text || "—", 50, pdf.y, { width: pdf.page.width - 100, lineGap: 3 });
        pdf.moveDown(0.4);
      };

      section("Decision Summary");
      body(doc.decisionSummary);

      if (doc.businessContext) { section("Business Context"); body(doc.businessContext); }
      if (doc.problemStatement) { section("Problem Statement"); body(doc.problemStatement); }

      // RAPID Roles table
      section("RAPID Role Assignments");
      const roles = ["recommend","agree","perform","input","decide"];
      const roleColors: Record<string,string> = {
        recommend:"#3b82f6", agree:"#10b981", decide:"#f59e0b",
        perform:"#8b5cf6", input:"#6b7280"
      };
      doc.roleAssignments.forEach((ra: any) => {
        const color = roleColors[ra.roleType] ?? "#6b7280";
        pdf.fontSize(9).fillColor(color).font("Helvetica-Bold")
          .text(`[${ra.roleType.toUpperCase()}]`, 50, pdf.y, { continued: true, width: 90 });
        pdf.fillColor("#334155").font("Helvetica")
          .text(`  ${ra.user.name} (${ra.user.email})`, { width: pdf.page.width - 160 });
      });
      pdf.moveDown(0.4);

      // Approvals
      if (doc.approvals.length > 0) {
        section("Approval Record");
        doc.approvals.forEach((a: any) => {
          pdf.fontSize(9).fillColor("#334155").font("Helvetica")
            .text(`${a.approver.name}  •  ${a.decision?.toUpperCase() ?? "PENDING"}  •  ${new Date(a.createdAt).toLocaleDateString("en-IN")}`, 50, pdf.y);
        });
        pdf.moveDown(0.4);
      }

      // Transcript
      if (doc.transcriptContent) {
        section("Meeting Transcript");
        pdf.fontSize(8.5).fillColor("#475569").font("Helvetica")
          .text(doc.transcriptContent.slice(0, 2000) + (doc.transcriptContent.length > 2000 ? "
[truncated — full transcript in system]" : ""),
            50, pdf.y, { width: pdf.page.width - 100, lineGap: 2 });
        pdf.moveDown(0.4);
      }

      // Footer
      pdf.moveTo(50, pdf.page.height - 50).lineTo(pdf.page.width - 50, pdf.page.height - 50).stroke("#e2e8f0");
      pdf.fontSize(8).fillColor("#94a3b8").font("Helvetica")
        .text(`RAPID Ledger  •  Complyance  •  Document ID: ${doc.id}`, 50, pdf.page.height - 38,
          { align: "center", width: pdf.page.width - 100 });

      pdf.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const filename = `${doc.documentCode}-v${doc.version}.pdf`;

    set.headers = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    };

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "transcript_exported",
        entityType: "RapidDocument",
        entityId: params.id,
        documentId: params.id,
        details: JSON.stringify({ filename, format: "pdf", documentCode: doc.documentCode }),
      },
    });

    return pdfBuffer;
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

// GET /documents/:id/export?format=txt — canonical export alias (sprint spec)
// (Keeps backward compat with /transcript/export — this is the new canonical path)
