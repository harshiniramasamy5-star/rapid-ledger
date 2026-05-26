import { prisma } from "./prisma";

export async function nextDocumentCode(): Promise<string> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT "documentCode") as count FROM "RapidDocument"
  `;
  const count = Number(result[0]?.count ?? 0);
  return `RAPID-${(count + 1).toString().padStart(3, "0")}`;
}
