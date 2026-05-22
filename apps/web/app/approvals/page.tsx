"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState<string|null>(null);
  const [notes, setNotes]         = useState<Record<string,string>>({});

  useEffect(() => {
    const token = localStorage.getItem("rapid_token");
    if (!token) { router.replace("/login"); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/approvals/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setApprovals(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load approvals"))
      .finally(() => setLoading(false));
  }, [router]);

  async function act(docId: string, approvalId: string, action: string) {
    const token = localStorage.getItem("rapid_token");
    setActing(approvalId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/documents/${docId}/approvals/${approvalId}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notes[approvalId] ?? "" }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setApprovals(prev => prev.filter(a => a.id !== approvalId));
        toast.success("Decision recorded: " + action.replace("-", " "));
      } else {
        toast.error(data.error?.message ?? "Something went wrong");
      }
    } catch {
      toast.error("Network error. Is the backend running?");
    } finally {
      setActing(null);
    }
  }

  const RISK_VARIANT: Record<string, "destructive"|"default"> = {
    high: "destructive", critical: "destructive",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">RAPID Ledger</p>
              <p className="text-xs text-slate-400 mt-0.5">Compliance Invoicing Platform</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-500"
            onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">Documents waiting for your review and decision.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading approvals...</p>
          </div>
        ) : approvals.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4 text-2xl">
                ✓
              </div>
              <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
              <p className="text-slate-400 text-sm mt-1">No pending approvals for you right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvals.map(approval => (
              <Card key={approval.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-slate-400 mb-1">
                        {approval.document?.documentCode}
                      </p>
                      <CardTitle className="text-lg text-slate-900">
                        {approval.document?.title}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge variant={RISK_VARIANT[approval.document?.riskLevel] ?? "outline"} className="capitalize">
                        {approval.document?.riskLevel} risk
                      </Badge>
                      {approval.document?.complianceImpact === 1 && (
                        <Badge variant="secondary">Compliance</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Decision summary */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Decision Summary
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {approval.document?.decisionSummary}
                    </p>
                  </div>

                  <Button variant="outline" size="sm" className="text-primary border-slate-200"
                    onClick={() => router.push(`/documents/${approval.document?.id}`)}>
                    View Full Document
                  </Button>

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">
                      Notes <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add context for your decision..."
                      value={notes[approval.id] ?? ""}
                      onChange={e => setNotes(n => ({ ...n, [approval.id]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => act(approval.document?.id, approval.id, "approve")}
                      disabled={acting === approval.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      Approve
                    </Button>
                    <Button
                      onClick={() => act(approval.document?.id, approval.id, "request-changes")}
                      disabled={acting === approval.id}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                      Request Changes
                    </Button>
                    <Button
                      onClick={() => act(approval.document?.id, approval.id, "reject")}
                      disabled={acting === approval.id}
                      variant="destructive"
                      className="font-semibold">
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
