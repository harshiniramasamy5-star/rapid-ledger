import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding users...");
  const password = await bcrypt.hash("password123", 10);
  const now = new Date();

  const users = [
    { id: "user_admin_001",     name: "Alice Admin",    email: "admin@rapid.dev",     role: "admin",          department: "Engineering" },
    { id: "user_creator_001",   name: "Carol Creator",  email: "creator@rapid.dev",   role: "creator",        department: "Product" },
    { id: "user_approver_001",  name: "Bob Approver",   email: "approver@rapid.dev",  role: "approver",       department: "Finance" },
    { id: "user_decider_001",   name: "Dana Decider",   email: "decider@rapid.dev",   role: "decision_owner", department: "Leadership" },
    { id: "user_performer_001", name: "Pete Performer", email: "performer@rapid.dev", role: "performer",      department: "Operations" },
    { id: "user_auditor_001",   name: "Amy Auditor",    email: "auditor@rapid.dev",   role: "auditor",        department: "Compliance" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: password, isActive: true, updatedAt: now },
      create: { ...u, passwordHash: password, isActive: true, createdAt: now, updatedAt: now },
    });
    console.log(`✓ ${u.email}`);
  }
  console.log("Seeded 6 users successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
