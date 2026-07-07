import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const TASKS_KEY = ["tasks", "pending"] as const;

export interface PendingTask {
  id: string;
  documentId: string;
  documentCode: string;
  documentTitle: string;
  documentStatus: string;
  deadline: string | null;
  riskLevel: string;
  workflowMode: string;
  roleType: string;
  actionRequired: string;
  stageOrder: number;
}

interface PendingTasksResponse {
  tasks: PendingTask[];
}

export function useMyPendingTasks(enabled: boolean = true) {
  return useQuery({
    queryKey: TASKS_KEY,
    queryFn: () => api.get<PendingTasksResponse>("/tasks/pending"),
    select: (data) => data.tasks,
    enabled,
  });
}

// Completes review / acknowledge / inform tasks — the only roles with no
// dedicated action route elsewhere in the app (recommend/input/agree/decide/
// perform already have their own flows on the document detail page).
export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      roleType,
      comment,
    }: {
      documentId: string;
      roleType: string;
      comment?: string;
    }) => api.post(`/documents/${documentId}/tasks/complete`, { roleType, comment }),

    onMutate: async ({ documentId, roleType }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<PendingTasksResponse>(TASKS_KEY);
      qc.setQueryData<PendingTasksResponse>(TASKS_KEY, (old) =>
        old
          ? { tasks: old.tasks.filter((t) => !(t.documentId === documentId && t.roleType === roleType)) }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
}
