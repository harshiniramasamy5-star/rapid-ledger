import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();



async function main() {
  console.log("Production seed — ensuring org exists...");

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
  console.log("Seed complete. No demo users or documents created.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
