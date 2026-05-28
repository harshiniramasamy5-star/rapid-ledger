import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "rapid-ledger-refresh-secret-dev";
const REFRESH_TTL = "7d";

export interface RefreshPayload {
  sub: string;
  role: string;
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
}

export async function rotateRefreshToken(
  oldToken: string,
  signAccessToken: (payload: { sub: string; role: string }) => string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const payload = verifyRefreshToken(oldToken);
  if (!payload) return null;

  const hash = hashToken(oldToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!stored) return null;

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newAccessToken = signAccessToken({ sub: payload.sub, role: payload.role });
  const newRefreshToken = signRefreshToken({ sub: payload.sub, role: payload.role });
  await storeRefreshToken(payload.sub, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
