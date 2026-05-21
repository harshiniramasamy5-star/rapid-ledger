export type Role =
  | "admin"
  | "creator"
  | "recommender"
  | "approver"
  | "decision_owner"
  | "performer"
  | "auditor";

const PERMISSIONS: Record<Role, string[]> = {
  admin:          ["*"],
  creator:        ["document:create", "document:edit", "document:submit", "document:read", "evidence:upload"],
  recommender:    ["document:read", "document:recommend"],
  approver:       ["document:read", "document:approve", "document:reject", "document:request_changes"],
  decision_owner: ["document:read", "document:finalize", "document:version"],
  performer:      ["document:read", "document:execute"],
  auditor:        ["document:read", "auditlog:read", "ledger:read"],
};

export function can(role: Role, action: string): boolean {
  const perms = PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(action);
}
