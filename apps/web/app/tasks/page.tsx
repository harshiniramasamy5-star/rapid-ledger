"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyPendingTasks, useCompleteTask, type PendingTask } from "@/hooks/use-tasks";

// review/acknowledge/inform have no dedicated UI elsewhere yet — they're
// completed right here. recommend/input/agree/decide/perform already have
// their own flows on the document detail page, so those just link through.
const INLINE_COMPLETE_ROLES = ["review", "acknowledge", "inform"];

const RISK_BADGE: Record<string, string> = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const ROLE_BADGE: Record<string, string> = {
  recommend: "bg-purple-50 text-purple-700 border-purple-200",
  agree: "bg-emerald-50 text-emerald-700 border-emerald-200",
  perform: "bg-blue-50 text-blue-700 border-blue-200",
  input: "bg-slate-50 text-slate-700 border-slate-200",
  decide: "bg-amber-50 text-amber-700 border-amber-200",
  review: "bg-cyan-50 text-cyan-700 border-cyan-200",
  acknowledge: "bg-pink-50 text-pink-700 border-pink-200",
  inform: "bg-gray-50 text-gray-700 border-gray-200",
};

function formatDeadline(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const overdue = d.getTime() < Date.now();
  return { text: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), overdue };
}

export default function TasksPage() {
  const router = useRouter();
  const { data: tasks = [], isLoading, error } = useMyPendingTasks();
  const { mutateAsync: complete } = useCompleteTask();
  const [acting, setActing] = useState<string | null>(null);

  async function handleComplete(task: PendingTask) {
    setActing(task.id);
    try {
      await complete({ documentId: task.documentId, roleType: task.roleType });
      toast.success(`Marked "${task.actionRequired}" complete`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete task");
    } finally {
      setActing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="pt-6 text-red-600 text-sm">
            Failed to load your pending tasks. Please refresh or check your connection.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pending Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks.length === 0
            ? "Nothing waiting on you right now"
            : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} requiring your action`}
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-sm text-muted-foreground">All caught up — no pending tasks</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const deadline = formatDeadline(task.deadline);
            const inline = INLINE_COMPLETE_ROLES.includes(task.roleType);
            return (
              <Card
                key={task.id}
                className="transition-all duration-200"
                style={{
                  opacity: acting === task.id ? 0.5 : 1,
                  pointerEvents: acting === task.id ? "none" : "auto",
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-medium leading-snug">
                        {task.documentTitle}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {task.documentCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`text-xs ${RISK_BADGE[task.riskLevel] ?? ""}`}>
                        {task.riskLevel} risk
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${ROLE_BADGE[task.roleType] ?? ""}`}>
                        {task.actionRequired}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{task.documentStatus.replace(/_/g, " ")}</span>
                    <span>·</span>
                    <span className="capitalize">{task.workflowMode}</span>
                    {deadline && (
                      <>
                        <span>·</span>
                        <span className={deadline.overdue ? "text-red-600 font-medium" : ""}>
                          {deadline.overdue ? "Overdue: " : "Due "}
                          {deadline.text}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {inline ? (
                      <Button size="sm" onClick={() => handleComplete(task)} disabled={!!acting}>
                        {acting === task.id ? "Completing..." : task.actionRequired}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => router.push(`/documents/${task.documentId}`)}>
                        {task.actionRequired} →
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/documents/${task.documentId}`)}
                    >
                      View Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
