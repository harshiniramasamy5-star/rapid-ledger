import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { createAuditLog } from "./audit.service";
import type { LoginResponse, PublicUser } from "../types";

export function toPublicUser(user: { id: string; name: string; email: string; role: string; department: string | null }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department };
}

export async function loginUser(email: string, password: string): Promise<LoginResponse | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return null;
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  void createAuditLog(user.id, "login", "User", user.id, { email: user.email });
  return { token, user: toPublicUser(user) }; // Fix 4: lowercase `user`
}

export async function getCurrentUser(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return toPublicUser(user);
}
