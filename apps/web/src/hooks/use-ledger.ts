import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LedgerEntry } from "@rapid-ledger/shared";

export const LEDGER_KEY = ["ledger"] as const;

export function useLedger(search?: string) {
  return useQuery({
    queryKey: [...LEDGER_KEY, search],
    queryFn: () =>
      api.get<LedgerEntry[]>(
        `/ledger${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}
