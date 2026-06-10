import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { createAuditLog } from "./audit.service";
import type { LoginResponse, PublicUser } from "../types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function toPublicUser(user: { id: string; name: string; email: string; role: string; department: string | null; totpEnabled?: boolean; orgId?: string | null }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, totpEnabled: user.totpEnabled ?? false, orgId: user.orgId ?? null };
}

export type LoginResult =
  | { success: true; data: LoginResponse }
  | { success: false; reason: "invalid_credentials" | "account_locked" | "account_inactive" | "email_not_verified" | "totp_required"; lockedUntil?: Date; userId?: string };

export async function loginUser(email: string, password: string, totpCode?: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Unknown email — don't reveal whether account exists
  // emailVerified checked after password validation
  if (!user) {
    return { success: false, reason: "invalid_credentials" };
  }

  // Inactive account
  if (!user.isActive) {
    return { success: false, reason: "account_inactive" };
  }

  // Account locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    void createAuditLog(user.id, "login_failed", "User", user.id, {
      email: user.email,
      reason: "account_locked",
      lockedUntil: user.lockedUntil.toISOString() });
    return { success: false, reason: "account_locked", lockedUntil: user.lockedUntil };
  }

  // Block login until email is verified
  if (!(user as { emailVerified?: boolean }).emailVerified) {
    return { success: false, reason: "email_not_verified" };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    const newFailedCount = user.failedLogins + 1;
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: newFailedCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null } });

    void createAuditLog(user.id, "login_failed", "User", user.id, {
      email: user.email,
      reason: "invalid_password",
      failedAttempts: newFailedCount,
      locked: shouldLock });

    return { success: false, reason: "invalid_credentials" };
  }

  // TOTP server-side gate — password verified above; now require code or signal challenge
  if ((user as { totpEnabled?: boolean }).totpEnabled && !totpCode) {
    return { success: false, reason: "totp_required" as any, userId: user.id };
  }

  // Validate TOTP if enabled
  if ((user as { totpEnabled?: boolean }).totpEnabled && totpCode) {
    try {
      const { verify } = await import("otplib");
      const _res = await verify({ token: totpCode, secret: user.totpSecret! });
      const valid = typeof _res === "object" && _res !== null ? (_res as Record<string, unknown>).valid : _res;
      if (!valid) {
        return { success: false, reason: "invalid_credentials" };
      }
    } catch {
      return { success: false, reason: "invalid_credentials" };
    }
  }

  // Successful login — reset failed attempts
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null } });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  void createAuditLog(user.id, "login", "User", user.id, {
    email: user.email,
    ip: "server-side" });

  return { success: true, data: { token, user: toPublicUser(user) } };
}

export async function getCurrentUser(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return null;
  return toPublicUser(user);
}

import { generateVerificationToken } from "./email.service";

const ALLOWED_DOMAINS = ['complyance.io', 'antna.co.in']

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; message?: string; token?: string }> {
  const emailDomain = email.split('@')[1]?.toLowerCase() ?? ''
  if (!ALLOWED_DOMAINS.includes(emailDomain)) {
    return { success: false, message: 'Only @complyance.io or @antna.co.in email addresses are allowed.' }
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { success: false, message: "An account with this email already exists." };

  const hashed = await bcrypt.hash(password, 10);
  const token  = generateVerificationToken();

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "viewer",
      emailVerified: false,
      verificationToken: token,
    },
  });

  try {
    const emailDomain = email.split("@")[1];
    if (emailDomain) {
      const matchedOrg = await prisma.organization.findFirst({
        where: { domain: { in: [emailDomain, emailDomain === 'antna.co.in' ? 'complyance.io' : emailDomain] } }
      });
      if (matchedOrg) {
        await prisma.user.update({ where: { email }, data: { orgId: matchedOrg.id } });
      }
    }
  } catch (_) { /* non-fatal — org assign fails silently */ }

  return { success: true, token };
}


export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; message?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true, message: "If this email is registered, a verification link will be sent." };
  if (user.emailVerified) return { success: false, message: "Email is already verified." };
  const token = generateVerificationToken();
  await prisma.user.update({ where: { id: user.id }, data: { verificationToken: token } });
  try {
    const emailSvc = await import("./email.service");
    await emailSvc.sendVerificationEmail(email, user.name, token);
  } catch (e) {
    console.error("[Auth] resend verification email failed:", e);
  }
  return { success: true, message: "Verification email sent." };
}

export async function verifyEmail(
  token: string
): Promise<{ success: boolean; message?: string; email?: string; name?: string }> {
  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user) return { success: false, message: "Invalid or expired verification token." };

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  return { success: true, email: user.email, name: user.name };
}

