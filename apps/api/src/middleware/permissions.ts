// permissions.ts — RBAC: role permission map, can(), hasPermission(), requirePermission()
import type { User, UserRole } from "@prisma/client";
import { Errors } from "../lib/errors";

export type Role = UserRole;

const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  admin:       new Set(["document:read","document:create","document:update","document:submit","document:approve","document:reject","document:finalize","document:version","document:recommend","role:assign","evidence:add","user:create","user:update","user:read","ledger:read","audit:read","report:read"]),
  creator:     new Set(["document:read","document:create","document:update","document:submit","document:version","role:assign","evidence:add","user:read","ledger:read","audit:read"]),
  approver:    new Set(["document:read","document:approve","document:reject","ledger:read","audit:read"]),
  recommender: new Set(["document:read","document:recommend","evidence:add","ledger:read"]),
  performer:   new Set(["document:read","document:finalize","ledger:read"]),
  viewer:      new Set(["document:read","ledger:read"]),
};

/** Check permission by role string (used by authorize.ts) */
export function can(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** Check permission by full User object */
export function hasPermission(user: User, permission: string): boolean {
  return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
}

/** Throw 403 if user lacks permission. Accepts Elysia's set (status is optional) */
export function requirePermission(
  user: User,
  permission: string,
  set: { status?: number | string },
): void {
  if (!hasPermission(user, permission)) {
    set.status = 403;
    throw new Error(JSON.stringify(Errors.forbidden()));
  }
}
