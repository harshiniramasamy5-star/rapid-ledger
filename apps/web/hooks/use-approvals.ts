import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Approval } from "@/lib/types";

export const APPROVALS_KEY = ["approvals"] as const;
export const DOCUMENTS_KEY = ["documents"] as const;

export function useMyApprovals() {
  return useQuery({
    queryKey: APPROVALS_KEY,
    queryFn: () => api.get<Approval[]>("/approvals/my"),
  });
}

export function useApprovalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      docId,
      approvalId,
      action,
      notes,
    }: {
      docId: string;
      approvalId: string;
      action: "approve" | "reject" | "request-changes";
      notes?: string;
    }) => api.post(`/documents/${docId}/approvals/${approvalId}/${action}`, { notes }),

    // Optimistic update — remove approval immediately from the list
    onMutate: async ({ approvalId }) => {
      await qc.cancelQueries({ queryKey: APPROVALS_KEY });
      const previous = qc.getQueryData<Approval[]>(APPROVALS_KEY);
      qc.setQueryData<Approval[]>(APPROVALS_KEY, (old) =>
        old?.filter((a) => a.id !== approvalId) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(APPROVALS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: APPROVALS_KEY });
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}
