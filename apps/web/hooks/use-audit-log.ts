import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLog } from "@rapid-ledger/shared";

export const AUDIT_KEY = ["audit-log"] as const;

export function useAuditLog() {
  return useQuery({
    queryKey: AUDIT_KEY,
    queryFn: () => api.get<AuditLog[]>("/audit-log"),
  });
}
