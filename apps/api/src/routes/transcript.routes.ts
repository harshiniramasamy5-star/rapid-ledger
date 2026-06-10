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

  // GET /documents/:id/export-pdf — HTML export (printable)
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

    const roles = doc.roleAssignments.map((ra: any) =>
      `<tr><td style="padding:6px 12px;font-weight:600;color:#6366f1;text-transform:uppercase;font-size:11px">${ra.roleType}</td><td style="padding:6px 12px;font-size:12px">${ra.user.name}</td><td style="padding:6px 12px;font-size:12px;color:#64748b">${ra.user.email}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>${doc.documentCode} — RAPID Ledger</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#0f172a}
      .header{border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
      .logo{font-size:20px;font-weight:800;color:#6366f1}
      .meta{font-size:11px;color:#94a3b8;text-align:right}
      .badge{display:inline-block;background:#6366f1;color:white;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600}
      h1{font-size:22px;margin:0 0 8px}
      h2{font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;margin:24px 0 8px;border-top:1px solid #f1f5f9;padding-top:16px}
      p{font-size:13px;line-height:1.6;color:#334155;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      tr:nth-child(even){background:#f8fafc}
      .transcript{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:11px;font-family:monospace;line-height:1.6;white-space:pre-wrap;max-height:400px;overflow:hidden}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="header">
      <div><div class="logo">RAPID Ledger</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">Compliance Decision Record</div></div>
      <div class="meta"><span class="badge">${doc.documentCode}</span><br/>v${doc.version} · ${doc.status.replace(/_/g," ").toUpperCase()}<br/>${doc.riskLevel.toUpperCase()} RISK · ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
    </div>
    <h1>${doc.title}</h1>
    <h2>Decision Summary</h2><p>${doc.decisionSummary ?? "—"}</p>
    ${doc.businessContext ? `<h2>Business Context</h2><p>${doc.businessContext}</p>` : ""}
    ${doc.problemStatement ? `<h2>Problem Statement</h2><p>${doc.problemStatement}</p>` : ""}
    <h2>RAPID Role Assignments</h2>
    <table><thead><tr style="background:#f1f5f9"><th style="padding:6px 12px;text-align:left;font-size:11px">Role</th><th style="padding:6px 12px;text-align:left;font-size:11px">Name</th><th style="padding:6px 12px;text-align:left;font-size:11px">Email</th></tr></thead><tbody>${roles}</tbody></table>
    ${doc.approvals.length > 0 ? `<h2>Approval Record</h2><table><tbody>${doc.approvals.map((a: any) => `<tr><td style="padding:6px 12px;font-size:12px">${a.approver.name}</td><td style="padding:6px 12px;font-size:12px;color:#6366f1;font-weight:600">${a.decision?.toUpperCase() ?? "PENDING"}</td><td style="padding:6px 12px;font-size:12px;color:#64748b">${new Date(a.createdAt).toLocaleDateString("en-IN")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${doc.transcriptContent ? `<h2>Meeting Transcript</h2><div class="transcript">${doc.transcriptContent.slice(0,2000).replace(/</g,"&lt;").replace(/>/g,"&gt;")}${doc.transcriptContent.length > 2000 ? "\n[truncated]" : ""}</div>` : ""}
    <div class="footer"><span>RAPID Ledger · Complyance</span><span>Document ID: ${doc.id}</span><span>Exported: ${new Date().toISOString()}</span></div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;

    set.headers = { "Content-Type": "text/html; charset=utf-8" };

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "transcript_exported",
        entityType: "RapidDocument",
        entityId: params.id,
        documentId: params.id,
        details: JSON.stringify({ format: "html-print", documentCode: doc.documentCode }),
      },
    });

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
