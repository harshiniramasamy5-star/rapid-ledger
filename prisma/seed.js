const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const pw = await bcrypt.hash("password123", 10);

  const creator = await prisma.user.upsert({ where: { email: "creator@rapid.dev" }, update: {}, create: { name: "Charlie Creator", email: "creator@rapid.dev", passwordHash: pw, role: "creator", department: "Product" } });
  await prisma.user.upsert({ where: { email: "admin@rapid.dev" }, update: {}, create: { name: "Alice Admin", email: "admin@rapid.dev", passwordHash: pw, role: "admin", department: "Engineering" } });
  const approver = await prisma.user.upsert({ where: { email: "approver@rapid.dev" }, update: {}, create: { name: "Sarah Security", email: "approver@rapid.dev", passwordHash: pw, role: "approver", department: "Security" } });
  const decider = await prisma.user.upsert({ where: { email: "decider@rapid.dev" }, update: {}, create: { name: "Dana Decide", email: "decider@rapid.dev", passwordHash: pw, role: "decision_owner", department: "Engineering" } });
  const performer = await prisma.user.upsert({ where: { email: "performer@rapid.dev" }, update: {}, create: { name: "Pete Perform", email: "performer@rapid.dev", passwordHash: pw, role: "performer", department: "Platform" } });
  await prisma.user.upsert({ where: { email: "auditor@rapid.dev" }, update: {}, create: { name: "Arthur Audit", email: "auditor@rapid.dev", passwordHash: pw, role: "auditor", department: "Compliance" } });
  console.log("Created 6 users");

  const doc = await prisma.rapidDocument.upsert({
    where: { documentCode_version: { documentCode: "RAPID-001", version: 1 } },
    update: {},
    create: { documentCode: "RAPID-001", title: "Migrate deployment approvals from Slack to GitHub PRs", decisionSummary: "Replace ad-hoc Slack message approvals with formal GitHub pull request approval gates.", businessContext: "Production deployments approved via Slack are not auditable.", problemStatement: "Lack of formal approval trail creates compliance risk.", proposedDecision: "Implement GitHub required reviewers on the deploy workflow.", alternativesConsidered: "1. Continue Slack (rejected). 2. Third-party tool (rejected).", riskLevel: "high", complianceImpact: true, department: "Engineering", deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: "draft", version: 1, createdBy: creator.id }
  });

  await prisma.rapidRoleAssignment.createMany({ skipDuplicates: true, data: [
    { documentId: doc.id, roleType: "recommend", userId: creator.id },
    { documentId: doc.id, roleType: "agree",     userId: approver.id },
    { documentId: doc.id, roleType: "perform",   userId: performer.id },
    { documentId: doc.id, roleType: "decide",    userId: decider.id },
  ]});

  await prisma.evidence.createMany({ skipDuplicates: true, data: [
    { documentId: doc.id, type: "link", title: "Security policy", urlOrPath: "https://example.com/policy", description: "Deployment approval requirements.", uploadedBy: creator.id },
    { documentId: doc.id, type: "meeting_note", title: "Architecture review March 2026", description: "Team agreed to move to GitHub approvals.", uploadedBy: creator.id },
  ]});

  await prisma.auditLog.create({ data: { actorId: creator.id, action: "document_created", objectType: "RapidDocument", objectId: doc.id, documentId: doc.id, details: JSON.stringify({ documentCode: "RAPID-001" }) } });

  console.log("Created RAPID-001 with roles and evidence");
  console.log("\nDemo credentials (password: password123)");
  console.log("  admin@rapid.dev     - Admin");
  console.log("  creator@rapid.dev   - Creator");
  console.log("  approver@rapid.dev  - Approver");
  console.log("  decider@rapid.dev   - Decision Owner");
  console.log("  performer@rapid.dev - Performer");
  console.log("  auditor@rapid.dev   - Auditor");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
