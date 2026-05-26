import { Elysia } from "elysia";
import { verifyToken, extractBearerToken } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import type { User } from "../types";

export const authMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  { as: "scoped" },
  async ({ headers, set }): Promise<{ user: User }> => {
    const token = extractBearerToken(headers.authorization);
    if (!token) { set.status = 401; throw new Error(JSON.stringify(Errors.unauthorized())); }
    const payload = verifyToken(token);
    if (!payload) { set.status = 401; throw new Error(JSON.stringify(Errors.unauthorized("Invalid or expired token"))); }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) { set.status = 401; throw new Error(JSON.stringify(Errors.unauthorized("User not found or disabled"))); }
    return { user };
  }
);
