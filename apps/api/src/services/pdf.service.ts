import PDFDocument from "pdfkit";
import type { RapidDocument, User, RoleAssignment, Approval, Evidence } from "@prisma/client";

type FullDocument = RapidDocument & {
  createdByUser?: Pick<User, "name" | "email"> | null;
  roleAssignments: (RoleAssignment & { user: Pick<User, "name" | "email"> })[];
  approvals: (Approval & { approver: Pick<User, "name" | "email"> })[];
  evidence: Evidence[];
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function formatStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function generateDocumentPdf(doc: FullDocument): Buffer {
  const chunks: Buffer[] = [];
  const pdf = new PDFDocument({ margin: 50, size: "A4" });

  pdf.on("data", chunk => chunks.push(chunk));

  const PRIMARY = "#4f46e5";
  const SLATE = "#64748b";
  const DARK = "#0f172a";
  const LIGHT = "#f8fafc";
  const W = 495;

  // ── Header ────────────────────────────────────────────────────────────────
  pdf.rect(50, 40, W, 70).fill(PRIMARY);
  pdf.fillColor("white").fontSize(20).font("Helvetica-Bold")
    .text("RAPID Ledger", 70, 55);
  pdf.fontSize(10).font("Helvetica")
    .text("Decision Governance Record", 70, 80);
  pdf.fontSize(10)
    .text(`${doc.documentCode}  ·  v${doc.version}`, 400, 55, { align: "right", width: 130 })
    .text(formatDate(doc.createdAt), 400, 70, { align: "right", width: 130 });

  pdf.fillColor(DARK).moveDown(3);

  // ── Title ─────────────────────────────────────────────────────────────────
  pdf.fontSize(16).font("Helvetica-Bold").fillColor(DARK)
    .text(doc.title, 50, 130);
  pdf.moveDown(0.3);

  // Status + Risk badges (text-based)
  pdf.fontSize(9).font("Helvetica").fillColor(SLATE)
    .text(`Status: ${formatStatus(doc.status)}   ·   Risk: ${doc.riskLevel.toUpperCase()}   ·   Compliance Impact: ${doc.complianceImpact ? "Yes" : "No"}   ·   Department: ${doc.department ?? "—"}`);
  pdf.moveDown(0.5);
  pdf.moveTo(50, pdf.y).lineTo(545, pdf.y).strokeColor("#e2e8f0").stroke();
  pdf.moveDown(0.8);

  // ── Section helper ────────────────────────────────────────────────────────
  function section(title: string) {
    pdf.moveDown(0.5);
    pdf.rect(50, pdf.y, W, 18).fill(LIGHT);
    pdf.fillColor(PRIMARY).fontSize(9).font("Helvetica-Bold")
      .text(title.toUpperCase(), 58, pdf.y - 14);
    pdf.fillColor(DARK).moveDown(0.8);
  }

  function field(label: string, value: string | null | undefined) {
    if (!value) return;
    pdf.fontSize(9).font("Helvetica-Bold").fillColor(SLATE).text(label, 50, pdf.y, { continued: true });
    pdf.font("Helvetica").fillColor(DARK).text(`  ${value}`);
    pdf.moveDown(0.3);
  }

  function body(text: string | null | undefined) {
    if (!text) return;
    pdf.fontSize(10).font("Helvetica").fillColor(DARK)
      .text(text, 50, pdf.y, { width: W, lineGap: 3 });
    pdf.moveDown(0.5);
  }

  // ── Decision Summary ──────────────────────────────────────────────────────
  section("Decision Summary");
  body(doc.decisionSummary);

  // ── Context ───────────────────────────────────────────────────────────────
  if (doc.businessContext || doc.problemStatement) {
    section("Business Context");
    field("Problem:", doc.problemStatement);
    body(doc.businessContext);
  }

  // ── Proposed Decision ─────────────────────────────────────────────────────
  if (doc.proposedDecision) {
    section("Proposed Decision");
    body(doc.proposedDecision);
  }

  // ── Alternatives ─────────────────────────────────────────────────────────
  if (doc.alternativesConsidered) {
    section("Alternatives Considered");
    body(doc.alternativesConsidered);
  }

  // ── RAPID Role Assignments ────────────────────────────────────────────────
  section("RAPID Role Assignments");
  const rapidRoles = ["recommend", "agree", "perform", "input", "decide"];
  rapidRoles.forEach(role => {
    const assignments = doc.roleAssignments.filter(r => r.roleType === role);
    if (assignments.length > 0) {
      field(`${role.toUpperCase()}:`, assignments.map(a => a.user.name).join(", "));
    }
  });
  pdf.moveDown(0.3);

  // ── Approvals ─────────────────────────────────────────────────────────────
  if (doc.approvals.length > 0) {
    section("Approval History");
    doc.approvals.forEach(a => {
      field(`${a.approver.name}:`, `${formatStatus(a.decision)}${a.comment ? ` — ${a.comment}` : ""} (${formatDate(a.createdAt)})`);
    });
  }

  // ── Evidence ──────────────────────────────────────────────────────────────
  if (doc.evidence.length > 0) {
    section("Supporting Evidence");
    doc.evidence.forEach(e => {
      field(`${e.title}:`, `${e.type}${e.urlOrPath ? ` — ${e.urlOrPath}` : ""}${e.description ? ` (${e.description})` : ""}`);
    });
  }

  // ── Recommendation & Input Notes ──────────────────────────────────────────
  if (doc.recommendationNotes) {
    section("Recommendation Notes");
    body(doc.recommendationNotes);
  }
  if (doc.inputNotes) {
    section("Input Notes");
    body(doc.inputNotes);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  pdf.moveDown(1);
  pdf.moveTo(50, pdf.y).lineTo(545, pdf.y).strokeColor("#e2e8f0").stroke();
  pdf.moveDown(0.5);
  pdf.fontSize(8).font("Helvetica").fillColor(SLATE)
    .text(`Generated by RAPID Ledger · ${new Date().toISOString()} · Document ${doc.documentCode} v${doc.version}`, 50, pdf.y, { align: "center", width: W });

  pdf.end();

  // Synchronously collect — pdfkit emits all data before end in this mode
  return Buffer.concat(chunks);
}
