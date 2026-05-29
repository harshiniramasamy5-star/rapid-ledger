import { PrismaClient, UserRole, DocumentStatus, RiskLevel, RoleType, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");
  const password = await bcrypt.hash("password123", 10);
  const now = new Date();

  const users = [
    { id: "user_admin_001",     name: "Alice Admin",    email: "admin@rapid.dev",     role: "admin" as UserRole,          department: "Engineering" },
    { id: "user_creator_001",   name: "Carol Creator",  email: "creator@rapid.dev",   role: "creator" as UserRole,        department: "Product" },
    { id: "user_approver_001",  name: "Bob Approver",   email: "approver@rapid.dev",  role: "approver" as UserRole,       department: "Finance" },
    { id: "user_decider_001",   name: "Dana Decider",   email: "decider@rapid.dev",   role: "approver" as UserRole, department: "Leadership" },
    { id: "user_performer_001", name: "Pete Performer", email: "performer@rapid.dev", role: "performer" as UserRole,      department: "Operations" },
    { id: "user_viewer_001",   name: "Amy Auditor",    email: "viewer@rapid.dev",   role: "viewer" as UserRole,       department: "Compliance" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password, isActive: true, updatedAt: now },
      create: { ...u, password, isActive: true, createdAt: now, updatedAt: now },
    });
    console.log(`✓ ${u.email}`);
  }

  const creator = await prisma.user.findUniqueOrThrow({ where: { email: "creator@rapid.dev" } });
  const decider = await prisma.user.findUniqueOrThrow({ where: { email: "decider@rapid.dev" } });
  const performer = await prisma.user.findUniqueOrThrow({ where: { email: "performer@rapid.dev" } });
  const approver = await prisma.user.findUniqueOrThrow({ where: { email: "approver@rapid.dev" } });

  // Demo Document 1 — FINALIZED (shows in ledger)
  const doc1 = await prisma.rapidDocument.upsert({
    where: { id: "doc_demo_001" },
    update: {},
    create: {
      id: "doc_demo_001",
      documentCode: "RAPID-DEMO-001",
      title: "Adopt TypeScript Strict Mode Across All Services",
      decisionSummary: "Enforce strict TypeScript compilation flags across all backend and frontend services to eliminate runtime type errors.",
      businessContext: "Recent production incidents traced to implicit any types in the payment service.",
      problemStatement: "Lack of type safety is causing preventable runtime errors in production.",
      proposedDecision: "Enable strict mode in all tsconfig files and fix all resulting errors within one sprint.",
      alternativesConsidered: "Gradual migration per file — rejected due to inconsistent enforcement.",
      riskLevel: RiskLevel.low,
      complianceImpact: false,
      department: "Engineering",
      deadline: new Date("2026-08-01"),
      status: DocumentStatus.finalized,
      version: 1,
      createdById: creator.id,
      submittedAt: new Date("2026-05-01"),
      finalizedAt: new Date("2026-05-10"),
      createdAt: new Date("2026-04-28"),
      updatedAt: new Date("2026-05-10"),
    },
  });

  await prisma.roleAssignment.upsert({
    where: { id: "role_demo1_recommend" },
    update: {},
    create: { id: "role_demo1_recommend", documentId: doc1.id, roleType: RoleType.recommend, userId: creator.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo1_decide" },
    update: {},
    create: { id: "role_demo1_decide", documentId: doc1.id, roleType: RoleType.decide, userId: decider.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo1_perform" },
    update: {},
    create: { id: "role_demo1_perform", documentId: doc1.id, roleType: RoleType.perform, userId: performer.id, createdAt: now },
  });

  await prisma.ledgerEntry.upsert({
    where: { id: "ledger_demo_001" },
    update: {},
    create: {
      id: "ledger_demo_001",
      documentId: doc1.id,
      documentCode: "RAPID-DEMO-001",
      version: 1,
      title: "Adopt TypeScript Strict Mode Across All Services",
      finalizedBy: decider.id,
      finalizedAt: new Date("2026-05-10"),
      summary: "Enforce strict TypeScript compilation flags across all services.",
      createdAt: new Date("2026-05-10"),
    },
  });

  // Demo Document 2 — APPROVED (shows in approvals queue)
  const doc2 = await prisma.rapidDocument.upsert({
    where: { id: "doc_demo_002" },
    update: {},
    create: {
      id: "doc_demo_002",
      documentCode: "RAPID-DEMO-002",
      title: "Migrate Authentication to OAuth 2.0",
      decisionSummary: "Replace current JWT-only auth with full OAuth 2.0 flow supporting SSO.",
      businessContext: "Enterprise customers require SSO integration for compliance.",
      problemStatement: "Current auth system blocks enterprise sales deals.",
      proposedDecision: "Implement OAuth 2.0 with Google and Microsoft providers by Q3 2026.",
      alternativesConsidered: "SAML — considered but OAuth 2.0 has broader library support.",
      riskLevel: RiskLevel.high,
      complianceImpact: true,
      department: "Engineering",
      deadline: new Date("2026-09-01"),
      status: DocumentStatus.approved,
      version: 1,
      createdById: creator.id,
      submittedAt: new Date("2026-05-20"),
      createdAt: new Date("2026-05-18"),
      updatedAt: new Date("2026-05-22"),
    },
  });

  await prisma.roleAssignment.upsert({
    where: { id: "role_demo2_recommend" },
    update: {},
    create: { id: "role_demo2_recommend", documentId: doc2.id, roleType: RoleType.recommend, userId: creator.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo2_agree" },
    update: {},
    create: { id: "role_demo2_agree", documentId: doc2.id, roleType: RoleType.agree, userId: approver.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo2_decide" },
    update: {},
    create: { id: "role_demo2_decide", documentId: doc2.id, roleType: RoleType.decide, userId: decider.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo2_perform" },
    update: {},
    create: { id: "role_demo2_perform", documentId: doc2.id, roleType: RoleType.perform, userId: performer.id, createdAt: now },
  });

  // Demo Document 3 — DRAFT (shows on dashboard)
  const doc3 = await prisma.rapidDocument.upsert({
    where: { id: "doc_demo_003" },
    update: {},
    create: {
      id: "doc_demo_003",
      documentCode: "RAPID-DEMO-003",
      title: "Introduce Feature Flag System",
      decisionSummary: "Adopt a feature flag platform to enable safe incremental rollouts.",
      businessContext: "Current all-or-nothing deployments increase rollback risk.",
      problemStatement: "Cannot safely test new features with subset of users.",
      proposedDecision: "Integrate LaunchDarkly SDK across all services by Q4 2026.",
      alternativesConsidered: "Build in-house — rejected due to maintenance overhead.",
      riskLevel: RiskLevel.medium,
      complianceImpact: false,
      department: "Product",
      deadline: new Date("2026-11-01"),
      status: DocumentStatus.draft,
      version: 1,
      createdById: creator.id,
      createdAt: new Date("2026-05-27"),
      updatedAt: new Date("2026-05-27"),
    },
  });

  await prisma.roleAssignment.upsert({
    where: { id: "role_demo3_recommend" },
    update: {},
    create: { id: "role_demo3_recommend", documentId: doc3.id, roleType: RoleType.recommend, userId: creator.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo3_decide" },
    update: {},
    create: { id: "role_demo3_decide", documentId: doc3.id, roleType: RoleType.decide, userId: decider.id, createdAt: now },
  });
  await prisma.roleAssignment.upsert({
    where: { id: "role_demo3_perform" },
    update: {},
    create: { id: "role_demo3_perform", documentId: doc3.id, roleType: RoleType.perform, userId: performer.id, createdAt: now },
  });

  // Audit log entries
  await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: [
      { id: "audit_001", userId: creator.id, action: AuditAction.document_created,   documentId: doc1.id, entityType: "RapidDocument", entityId: doc1.id, details: { documentCode: "RAPID-DEMO-001" }, createdAt: new Date("2026-04-28") },
      { id: "audit_002", userId: decider.id, action: AuditAction.document_finalized,  documentId: doc1.id, entityType: "RapidDocument", entityId: doc1.id, details: { documentCode: "RAPID-DEMO-001" }, createdAt: new Date("2026-05-10") },
      { id: "audit_003", userId: creator.id, action: AuditAction.document_created,   documentId: doc2.id, entityType: "RapidDocument", entityId: doc2.id, details: { documentCode: "RAPID-DEMO-002" }, createdAt: new Date("2026-05-18") },
      { id: "audit_004", userId: approver.id, action: AuditAction.document_approved, documentId: doc2.id, entityType: "RapidDocument", entityId: doc2.id, details: { documentCode: "RAPID-DEMO-002" }, createdAt: new Date("2026-05-22") },
      { id: "audit_005", userId: creator.id, action: AuditAction.document_created,   documentId: doc3.id, entityType: "RapidDocument", entityId: doc3.id, details: { documentCode: "RAPID-DEMO-003" }, createdAt: new Date("2026-05-27") },
    ],
  });

  console.log("✓ 3 demo documents seeded (FINALIZED + APPROVED + DRAFT)");
  console.log("✓ Ledger entry seeded");
  console.log("✓ Audit log seeded");
  console.log("Seeding complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
