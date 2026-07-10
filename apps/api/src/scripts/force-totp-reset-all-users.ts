// One-off remediation script: force-reset TOTP for every user and revoke all
// outstanding refresh tokens, following the credential-exposure incident.
// Rationale: TOTP secrets were encrypted at rest (see migrate-encrypt-totp-secrets.ts),
// but if the plaintext secret or the encryption key was ever exposed alongside the
// .dump files, an encrypted-at-rest secret offers no protection after the fact —
// the only safe remediation is to invalidate it and require re-enrollment.
//
// This wipes totpSecret + totpEnabled for every user (they'll see the normal
// /auth/totp/setup flow again next time they try to enable 2FA) and revokes
// every non-expired refresh token so no session survives on old credentials.
//
// Usage: bun run src/scripts/force-totp-reset-all-users.ts

import { prisma } from "../lib/prisma";
import { createAuditLog } from "../services/audit.service";

async function main() {
  const usersWithTotp = await prisma.user.findMany({
    where: { totpSecret: { not: null } },
    select: { id: true, email: true, totpEnabled: true },
  });

  console.log(`Found ${usersWithTotp.length} user(s) with a totpSecret set.`);

  for (const u of usersWithTotp) {
    await prisma.user.update({
      where: { id: u.id },
      data: { totpSecret: null, totpEnabled: false },
    });
    await createAuditLog(u.id, "totp_disabled", "User", u.id, {
      reason: "admin_forced_reset",
      previouslyEnabled: u.totpEnabled,
    });
    console.log(`  reset TOTP for ${u.email}`);
  }

  const revoked = await prisma.refreshToken.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.log(`Revoked ${revoked.count} active refresh token(s).`);
  console.log(`Done. ${usersWithTotp.length} user(s) will need to re-enroll TOTP on next login.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
