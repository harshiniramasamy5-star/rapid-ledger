import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@rapid-ledger/shared";

export const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<User>("/auth/me"),
    retry: 1,
  });
}
