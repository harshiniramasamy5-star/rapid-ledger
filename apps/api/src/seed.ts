import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding org and test users...");

  await prisma.organization.upsert({
    where: { id: "cmq2vwnsj0008j8lfjqanx4dz" },
    update: {},
    create: {
      id: "cmq2vwnsj0008j8lfjqanx4dz",
      name: "Complyance",
      domain: "complyance.io",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log("✓ Complyance org ensured");

  const hash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "admin@rapid.com",    name: "Demo Admin",    role: "admin"    as const },
    { email: "creator@rapid.com",  name: "Demo Creator",  role: "creator"  as const },
    { email: "approver@rapid.com", name: "Demo Approver", role: "approver" as const },
  ];

  for (const u of users) {
    // Admin fixture needs totpEnabled=true: inviting members now requires
    // 2FA to be set up (server-side gate on POST /orgs/:id/invite).
    const isAdmin = u.role === "admin";
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hash,
        emailVerified: true,
        totpEnabled: isAdmin,
        totpSecret: null,
      },
      create: {
        email: u.email,
        name: u.name,
        password: hash,
        role: u.role,
        emailVerified: true,
        totpEnabled: isAdmin,
        orgId: "cmq2vwnsj0008j8lfjqanx4dz",
      },
    });
    console.log("✓ User ensured:", u.email);
  }

  // Dedicated fixture user for the invite-flow E2E suite. Always reset to
  // org-less on every seed run so the suite is idempotent and re-runnable
  // against prod/staging without manual cleanup between runs.
  const inviteeEmail = "invitee@rapid.com";
  const invitee = await prisma.user.upsert({
    where: { email: inviteeEmail },
    update: {
      password: hash,
      emailVerified: true,
      totpEnabled: false,
      totpSecret: null,
      orgId: null,
      role: "viewer",
    },
    create: {
      email: inviteeEmail,
      name: "Demo Invitee",
      password: hash,
      role: "viewer",
      emailVerified: true,
      totpEnabled: false,
      orgId: null,
    },
  });
  await prisma.workspaceMember.deleteMany({ where: { userId: invitee.id } });
  await prisma.invite.deleteMany({ where: { email: inviteeEmail } });
  console.log("✓ Invitee fixture reset (org-less):", inviteeEmail);

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
