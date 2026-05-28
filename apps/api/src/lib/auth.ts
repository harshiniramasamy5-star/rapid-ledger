// auth.ts — JWT utilities: sign, verify, extract bearer token
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";

const JWT_SECRET = process.env.JWT_SECRET ?? "rapid-ledger-dev-secret-change-in-production";

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "object" && "userId" in decoded) return decoded as JwtPayload;
    return null;
  } catch { return null; }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
