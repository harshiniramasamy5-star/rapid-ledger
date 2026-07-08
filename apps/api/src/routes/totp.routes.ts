import { Elysia } from "elysia";
import { verify as verifyTOTP, generateURI, generateSecret } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { createAuditLog } from "../services/audit.service";
import { signToken } from "../lib/auth";
import { toPublicUser } from "../services/auth.service";
import { checkRateLimit } from "../lib/rate-limit";
import { encryptSecret, decryptSecret } from "../lib/crypto";

// TOTP codes are 6 digits (1M combinations) — must be throttled much tighter
// than the general login limiter or brute force becomes trivial.
const TOTP_MAX_ATTEMPTS = 10;
const TOTP_WINDOW_MS = 15 * 60 * 1000; // 15 min

// Public route: validate TOTP code and issue full JWT (second factor)
export const totpPublicRoutes = new Elysia({ prefix: "/auth/totp" })
  .post("/validate", async ({ body, set }) => {
    const { userId, code } = body as { userId: string; code: string };
    if (!userId || !code) { set.status = 400; return { error: "userId and code required" }; }

    const rateCheck = checkRateLimit(`totp:${userId}`, TOTP_MAX_ATTEMPTS, TOTP_WINDOW_MS);
    if (!rateCheck.allowed) {
      set.status = 429;
      return { error: "Too many TOTP attempts. Try again in 15 minutes." };
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser?.totpSecret || !dbUser.totpEnabled) {
      set.status = 400;
      return { error: "TOTP not enabled for this user" };
    }

    const _res = await verifyTOTP({ token: code, secret: decryptSecret(dbUser.totpSecret) });
    const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
    if (!valid) { set.status = 401; return { error: "invalid TOTP code" }; }

    // Issue full JWT now that both factors are confirmed
    const token = signToken({ userId: dbUser.id, email: dbUser.email, role: dbUser.role });

    await createAuditLog(dbUser.id, "login", "User", dbUser.id, { email: dbUser.email, mfaVerified: true });

    return { valid: true, token, user: toPublicUser(dbUser) };
  });

export const totpRoutes = new Elysia({ prefix: "/auth/totp" })
  .use(authMiddleware)

  .post("/setup", async ({ user, set }) => {
    if (user.totpEnabled) { set.status = 400; return { error: "TOTP already enabled" }; }
    const secret = generateSecret();
    const otpauth = generateURI({ label: user.email, issuer: "RAPID Ledger", secret, strategy: "totp" });
    const qrCode = await QRCode.toDataURL(otpauth);
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: encryptSecret(secret) } });
    return { secret, qrCode, otpauth };
  })

  .post("/verify", async ({ user, body, set }) => {
    const { code } = body as { code: string };
    if (!code) { set.status = 400; return { error: "code required" }; }
    const rateCheck = checkRateLimit(`totp:${user.id}`, TOTP_MAX_ATTEMPTS, TOTP_WINDOW_MS);
    if (!rateCheck.allowed) {
      set.status = 429;
      return { error: "Too many TOTP attempts. Try again in 15 minutes." };
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.totpSecret) { set.status = 400; return { error: "run /setup first" }; }
    const _res = await verifyTOTP({ token: code, secret: decryptSecret(dbUser.totpSecret) });
    const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
    if (!valid) { set.status = 401; return { error: "invalid TOTP code" }; }
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    await createAuditLog(user.id, "totp_enabled", "User", user.id, {});
    return { message: "TOTP enabled successfully" };
  })

  .post("/disable", async ({ user, body, set }) => {
    const { code } = body as { code: string };
    if (!code) { set.status = 400; return { error: "code required" }; }
    const rateCheck = checkRateLimit(`totp:${user.id}`, TOTP_MAX_ATTEMPTS, TOTP_WINDOW_MS);
    if (!rateCheck.allowed) {
      set.status = 429;
      return { error: "Too many TOTP attempts. Try again in 15 minutes." };
    }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.totpSecret || !dbUser.totpEnabled) { set.status = 400; return { error: "TOTP not enabled" }; }
    const _res = await verifyTOTP({ token: code, secret: decryptSecret(dbUser.totpSecret) });
    const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
    if (!valid) { set.status = 401; return { error: "invalid TOTP code" }; }
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
    await createAuditLog(user.id, "totp_disabled", "User", user.id, {});
    return { message: "TOTP disabled" };
  });
