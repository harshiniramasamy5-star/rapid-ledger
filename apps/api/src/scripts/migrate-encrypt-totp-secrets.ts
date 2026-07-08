// One-off backfill: encrypt any User.totpSecret values still stored as plaintext
// from before the encryption-at-rest change. Safe to re-run — already-encrypted
// rows (isEncrypted() true) are skipped.
//
// Usage: bun run src/scripts/migrate-encrypt-totp-secrets.ts

import { prisma } from "../lib/prisma";
import { encryptSecret, isEncrypted } from "../lib/crypto";

async function main() {
  const users = await prisma.user.findMany({
    where: { totpSecret: { not: null } },
    select: { id: true, email: true, totpSecret: true },
  });

  console.log(`Found ${users.length} user(s) with a totpSecret set.`);

  let migrated = 0;
  for (const u of users) {
    if (!u.totpSecret || isEncrypted(u.totpSecret)) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: { totpSecret: encryptSecret(u.totpSecret) },
    });
    console.log(`  encrypted totpSecret for ${u.email}`);
    migrated++;
  }

  console.log(`Done. Migrated ${migrated} plaintext secret(s), ${users.length - migrated} already encrypted or empty.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
