"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyApprovals, useApprovalAction } from "@/hooks/use-approvals";
import type { Approval } from "@rapid-ledger/shared";
import { RISK_LABELS, STATUS_LABELS, RiskLevel, DocumentStatus } from "@rapid-ledger/shared";

const RISK_BADGE: Record<string, string> = {
  low:      "bg-green-50 text-green-700 border-green-200",
  medium:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  high:     "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { data: approvals = [], isLoading, error } = useMyApprovals();
  const { mutateAsync: act } = useApprovalAction();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  async function handleAction(
    approval: Approval,
    action: "approve" | "reject" | "request-changes"
  ) {
    setActing(approval.id);
    try {
      await act({
        docId: approval.document.id,
        approvalId: approval.id,
        action,
        notes: notes[approval.id] ?? "",
      });
      toast.success(
        action === "approve" ? "Approved" :
        action === "reject"  ? "Rejected" :
        "Changes requested"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card className="border-red-200">
          <CardContent className="pt-6 text-red-600 text-sm">
            Failed to load approvals. Please refresh or check your connection.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {approvals.length === 0
            ? "No approvals awaiting your decision"
            : `${approvals.length} decision${approvals.length !== 1 ? "s" : ""} awaiting review`}
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-sm text-muted-foreground">All caught up — no pending approvals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card
              key={approval.id}
              className="transition-all duration-200"
              style={{
                opacity: acting === approval.id ? 0.5 : 1,
                pointerEvents: acting === approval.id ? "none" : "auto",
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-medium leading-snug">
                      {approval.document.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {approval.document.documentCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${RISK_BADGE[approval.document.riskLevel] ?? ""}`}
                    >
                      {RISK_LABELS[approval.document.riskLevel as RiskLevel] ?? approval.document.riskLevel} risk
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {STATUS_LABELS[approval.document.status as DocumentStatus] ?? approval.document.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add notes (optional)..."
                  className="text-sm resize-none h-20"
                  value={notes[approval.id] ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [approval.id]: e.target.value }))
                  }
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleAction(approval, "approve")}
                    disabled={!!acting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {acting === approval.id ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(approval, "request-changes")}
                    disabled={!!acting}
                  >
                    Request Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(approval, "reject")}
                    disabled={!!acting}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/documents/${approval.document.id}`)}
                  >
                    View Document →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
