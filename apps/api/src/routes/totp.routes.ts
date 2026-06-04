import { Elysia } from "elysia";
import { verify as verifyTOTP, generateURI, generateSecret } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

export const totpPublicRoutes = new Elysia({ prefix: "/auth/totp" })
  .post("/validate", async ({ body, set }) => {
    const { userId, code } = body as { userId: string; code: string };
    if (!userId || !code) { set.status = 400; return { error: "userId and code required" }; }
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser?.totpSecret || !dbUser.totpEnabled) {
      set.status = 400;
      return { error: "TOTP not enabled for this user" };
    }
    const _res = await verifyTOTP({ token: code, secret: dbUser.totpSecret });
    const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
    if (!valid) { set.status = 401; return { error: "invalid TOTP code" }; }
    return { valid: true, userId };
  });

export const totpRoutes = new Elysia({ prefix: "/auth/totp" })
  .use(authMiddleware)

  .post("/setup", async ({ user, set }) => {
    if (user.totpEnabled) { set.status = 400; return { error: "TOTP already enabled" }; }
    const secret = generateSecret();
    const otpauth = generateURI({ label: user.email, issuer: "RAPID Ledger", secret, strategy: "totp" });
    const qrCode = await QRCode.toDataURL(otpauth);
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    return { secret, qrCode, otpauth };
  })

  .post("/verify", async ({ user, body, set }) => {
    const { code } = body as { code: string };
    if (!code) { set.status = 400; return { error: "code required" }; }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.totpSecret) { set.status = 400; return { error: "run /setup first" }; }
    const _res = await verifyTOTP({ token: code, secret: dbUser.totpSecret });
    const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
    if (!valid) { set.status = 401; return { error: "invalid TOTP code" }; }
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    return { message: "TOTP enabled successfully" };
  })

  .post("/disable", async ({ user, body, set }) => {
    const { code } = body as { code: string };
    if (!code) { set.status = 400; return { error: "code required" }; }
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.totpSecret || !dbUser.totpEnabled) { set.status = 400; return { error: "TOTP not enabled" }; }
    const _res = await verifyTOTP({ token: code, secret: dbUser.totpSecret });
    const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
    if (!valid) { set.status = 401; return { error: "invalid TOTP code" }; }
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
    return { message: "TOTP disabled" };
  });
