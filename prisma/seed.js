const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const pw = await bcrypt.hash("password123", 10);

  // Core users — no auditor, admin is the decider
  const admin = await prisma.user.upsert({
    where: { email: "admin@rapid.com" }, update: { emailVerified: true },
    create: { name: "Alice Admin", email: "admin@rapid.com", password: pw, role: "admin", department: "Engineering", emailVerified: true }
  });
  const creator = await prisma.user.upsert({
    where: { email: "creator@rapid.com" }, update: { emailVerified: true },
    create: { name: "Carol Creator", email: "creator@rapid.com", password: pw, role: "creator", department: "Product", emailVerified: true }
  });
  const recommender = await prisma.user.upsert({
    where: { email: "recommender@rapid.com" }, update: { emailVerified: true },
    create: { name: "Ray Recommender", email: "recommender@rapid.com", password: pw, role: "recommender", department: "Strategy", emailVerified: true }
  });
  const approver = await prisma.user.upsert({
    where: { email: "approver@rapid.com" }, update: { emailVerified: true },
    create: { name: "Sarah Approver", email: "approver@rapid.com", password: pw, role: "approver", department: "Security", emailVerified: true }
  });
  const performer = await prisma.user.upsert({
    where: { email: "performer@rapid.com" }, update: { emailVerified: true },
    create: { name: "Pete Performer", email: "performer@rapid.com", password: pw, role: "performer", department: "Platform", emailVerified: true }
  });
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@rapid.com" }, update: { emailVerified: true },
    create: { name: "Victor Viewer", email: "viewer@rapid.com", password: pw, role: "viewer", department: "Operations", emailVerified: true }
  });

  console.log("Created 6 users (no auditor — admin is the decider)");

  // Seed document
  const doc = await prisma.rapidDocument.upsert({
    where: { documentCode_version: { documentCode: "RAPID-001", version: 1 } },
    update: {},
    create: {
      documentCode: "RAPID-001",
      title: "Migrate deployment approvals from Slack to GitHub PRs",
      decisionSummary: "Replace ad-hoc Slack approvals with formal GitHub PR approval gates.",
      businessContext: "Production deployments approved via Slack are not auditable.",
      problemStatement: "Lack of formal approval trail creates compliance risk.",
      proposedDecision: "Implement GitHub required reviewers on the deploy workflow.",
      alternativesConsidered: "1. Continue Slack (rejected). 2. Third-party tool (rejected).",
      riskLevel: "high",
      complianceImpact: true,
      department: "Engineering",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "draft",
      version: 1,
      createdById: creator.id,
    }
  });

  // RAPID role assignments — admin as decide, recommender, approver, performer, viewer as input
  await prisma.roleAssignment.createMany({
    skipDuplicates: true,
    data: [
      { documentId: doc.id, roleType: "recommend", userId: recommender.id },
      { documentId: doc.id, roleType: "agree",     userId: approver.id },
      { documentId: doc.id, roleType: "perform",   userId: performer.id },
      { documentId: doc.id, roleType: "decide",    userId: admin.id },
      { documentId: doc.id, roleType: "input",     userId: viewer.id },
    ]
  });

  // Evidence
  await prisma.evidence.createMany({
    skipDuplicates: true,
    data: [
      { documentId: doc.id, type: "link", title: "Security policy", urlOrPath: "https://example.com/policy", description: "Deployment approval requirements.", uploadedBy: creator.id },
      { documentId: doc.id, type: "meeting_note", title: "Architecture review", urlOrPath: "https://example.com/notes", description: "Team agreed to move to GitHub approvals.", uploadedBy: creator.id },
    ]
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: creator.id,
      action: "document_created",
      entityType: "RapidDocument",
      entityId: doc.id,
      documentId: doc.id,
      details: JSON.stringify({ documentCode: "RAPID-001" })
    }
  });

  console.log("Created RAPID-001 with RAPID roles and evidence");
  console.log("\nDemo credentials (password: password123)");
  console.log("  admin@rapid.com        - Admin (Decider — king)");
  console.log("  creator@rapid.com      - Creator");
  console.log("  recommender@rapid.com  - Recommender");
  console.log("  approver@rapid.com     - Approver");
  console.log("  performer@rapid.com    - Performer");
  console.log("  viewer@rapid.com       - Viewer (Input giver)");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
