import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding users...");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  await prisma.user.upsert({
    where: { email: "admin@rapid.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@rapid.com",
      passwordHash: await hash("password123"),
      role: "admin",
      department: "Management",
    },
  });

  await prisma.user.upsert({
    where: { email: "creator@rapid.com" },
    update: {},
    create: {
      name: "Document Creator",
      email: "creator@rapid.com",
      passwordHash: await hash("password123"),
      role: "creator",
      department: "Operations",
    },
  });

  await prisma.user.upsert({
    where: { email: "recommender@rapid.com" },
    update: {},
    create: {
      name: "Risk Recommender",
      email: "recommender@rapid.com",
      passwordHash: await hash("password123"),
      role: "recommender",
      department: "Risk",
    },
  });

  await prisma.user.upsert({
    where: { email: "approver@rapid.com" },
    update: {},
    create: {
      name: "Senior Approver",
      email: "approver@rapid.com",
      passwordHash: await hash("password123"),
      role: "approver",
      department: "Finance",
    },
  });

  await prisma.user.upsert({
    where: { email: "decision@rapid.com" },
    update: {},
    create: {
      name: "Decision Owner",
      email: "decision@rapid.com",
      passwordHash: await hash("password123"),
      role: "decision_owner",
      department: "Leadership",
    },
  });

  await prisma.user.upsert({
    where: { email: "performer@rapid.com" },
    update: {},
    create: {
      name: "Task Performer",
      email: "performer@rapid.com",
      passwordHash: await hash("password123"),
      role: "performer",
      department: "Operations",
    },
  });

  await prisma.user.upsert({
    where: { email: "auditor@rapid.com" },
    update: {},
    create: {
      name: "Audit Officer",
      email: "auditor@rapid.com",
      passwordHash: await hash("password123"),
      role: "auditor",
      department: "Compliance",
    },
  });

  console.log("✅ All users seeded successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
