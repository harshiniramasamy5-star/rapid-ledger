import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USERS = [
  { name: "Alice Admin",      email: "admin@rapid.dev",       role: UserRole.admin,       department: "Operations" },
  { name: "Carol Creator",    email: "creator@rapid.dev",     role: UserRole.creator,     department: "Engineering" },
  { name: "Bob Approver",     email: "approver@rapid.dev",    role: UserRole.approver,    department: "Legal" },
  { name: "Rick Recommender", email: "recommender@rapid.dev", role: UserRole.recommender, department: "Product" },
  { name: "Pam Performer",    email: "performer@rapid.dev",   role: UserRole.performer,   department: "Engineering" },
  { name: "Vera Viewer",      email: "viewer@rapid.dev",      role: UserRole.viewer,      department: "Finance" },
];

async function main() {
  console.log("Seeding database...");
  const hashed = await bcrypt.hash("password123", 10);
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashed, isActive: true },
    });
    console.log("  done: " + u.name);
  }
  console.log("Seed complete. All users password: password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
