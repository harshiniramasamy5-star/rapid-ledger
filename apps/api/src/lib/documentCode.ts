import { prisma } from "./prisma";

/**
 * Generate the next document code as RAPID-NNN.
 * Derives from the highest existing numeric suffix (not a row count),
 * so deletions and non-contiguous codes don't cause collisions.
 */
export async function nextDocumentCode(): Promise<string> {
  const result = await prisma.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(CAST(SUBSTRING("documentCode" FROM 'RAPID-([0-9]+)') AS INTEGER)) as max
    FROM "RapidDocument"
    WHERE "documentCode" ~ '^RAPID-[0-9]+$'
  `;
  const next = Number(result[0]?.max ?? 0) + 1;
  return `RAPID-${next.toString().padStart(3, "0")}`;
}
