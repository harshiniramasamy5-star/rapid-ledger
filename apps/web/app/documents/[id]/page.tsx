"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const STATUS_CONFIG: Record<string, { variant: "default"|"secondary"|"destructive"|"outline"; label: string; color: string }> = {
  draft:              { variant: "outline",     label: "Draft",              color: "text-slate-600"   },
  submitted:          { variant: "secondary",   label: "Submitted",          color: "text-blue-600"    },
  awaiting_agreement: { variant: "secondary",   label: "Awaiting Agreement", color: "text-amber-600"   },
  approved:           { variant: "default",     label: "Approved",           color: "text-emerald-600" },
  finalized:          { variant: "default",     label: "Finalized",          color: "text-indigo-600"  },
  execution_complete: { variant: "default",     label: "Execution Complete", color: "text-emerald-600" },
  rejected:           { variant: "destructive", label: "Rejected",           color: "text-red-600"     },
  needs_changes:      { variant: "secondary",   label: "Needs Changes",      color: "text-amber-600"   },
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  recommend: { label: "R — Recommend", color: "text-purple-700",  bg: "bg-purple-50 border-purple-200"  },
  agree:     { label: "A — Agree",     color: "text-blue-700",    bg: "bg-blue-50 border-blue-200"      },
  perform:   { label: "P — Perform",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200"},
  input:     { label: "I — Input",     color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"    },
  decide:    { label: "D — Decide",    color: "text-red-700",     bg: "bg-red-50 border-red-200"        },
};

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc]               = useState<any>(null);
  const [me, setMe]                 = useState<any>(null);
  const [myApproval, setMyApproval] = useState<any>(null);
  const [approvalNotes, setApprovalNotes]     = useState("");
  const [execNotes, setExecNotes]             = useState("");
  const [recommendNotes, setRecommendNotes]   = useState("");
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState(false);

  function token() { return localStorage.getItem("rapid_token") ?? ""; }

  async function load() {
    try {
      const t = token();
      if (!t) { router.replace("/login"); return; }
      const [meRes, docRes, appRes] = await Promise.all([
        fetch(`${API}/auth/me`,            { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/documents/${params.id}`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/approvals/my`,       { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const [meData, docData, appData] = await Promise.all([meRes.json(), docRes.json(), appRes.json()]);
      setMe(meData);
      setDoc(docData?.error ? null : docData);
      const found = Array.isArray(appData) ? appData.find((a: any) => a.documentId === params.id || a.document?.id === params.id) : null;
      setMyApproval(found ?? null);
    } catch { toast.error("Failed to load document"); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]);

  async function apiPost(path: string, body?: any) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { res, data: await res.json() };
  }

  async function handle(action: () => Promise<void>) {
    setActing(true);
    try { await action(); } catch (e: any) { toast.error(e.message ?? "Something went wrong"); }
    setActing(false);
  }

  const myId    = me?.id ?? "";
  const roles   = doc?.roleAssignments ?? [];
  const myRole  = roles.find((r: any) => r.userId === myId);
  const isCreator   = doc?.createdBy === myId;
  const status      = doc?.status ?? "";

  const canSubmit   = isCreator && status === "draft";
  const canAgree    = !!myApproval && ["submitted","awaiting_agreement"].includes(status);
  const canFinalize = myRole?.roleType === "decide" && status === "approved";
  const canComplete = myRole?.roleType === "perform" && status === "finalized";
  const canVersion  = myRole?.roleType === "decide" && ["finalized","execution_complete"].includes(status);
  const canRecommend = myRole?.roleType === "recommend" && ["draft","needs_changes"].includes(status);
  const isRecommenderWaiting = myRole?.roleType === "recommend" && status === "awaiting_agreement";

  const sc = STATUS_CONFIG[status] ?? { variant: "outline" as const, label: status, color: "text-slate-600" };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading document...</p>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-3">📄</p>
        <p className="text-lg font-semibold text-slate-800">Document not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );

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

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-slate-400">{doc.documentCode}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">v{doc.version}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{doc.title}</h1>
            {me && (
              <p className="text-xs text-slate-400 mt-1">
                Logged in as <span className="font-semibold text-slate-600">{me.email}</span>
                {myRole && <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded text-slate-600 capitalize">{myRole.roleType}</span>}
                {isCreator && !myRole && <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded text-slate-600">creator</span>}
              </p>
            )}
          </div>
          <Badge variant={sc.variant} className="text-sm px-3 py-1 flex-shrink-0 capitalize">
            {sc.label}
          </Badge>
        </div>

        {/* Actions */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {canSubmit && (
              <Button className="w-full h-11 font-semibold" disabled={acting}
                onClick={() => handle(async () => {
                  const { res, data } = await apiPost(`/documents/${params.id}/submit`);
                  if (res.ok) { toast.success("Document submitted for approval!"); await load(); }
                  else toast.error(data?.error?.message ?? "Submit failed");
                })}>
                {acting ? "Submitting..." : "Submit Document for Approval"}
              </Button>
            )}

            {canAgree && (
              <div className="space-y-3">
                <textarea rows={2} placeholder="Notes (optional)..."
                  value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
                <div className="grid grid-cols-3 gap-3">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={acting}
                    onClick={() => handle(async () => {
                      const { res, data } = await apiPost(`/documents/${params.id}/approvals/${myApproval.id}/approve`, { notes: approvalNotes });
                      if (res.ok) { toast.success("Approved!"); setMyApproval(null); await load(); }
                      else toast.error(data?.error?.message ?? "Failed");
                    })}>
                    Approve
                  </Button>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold" disabled={acting}
                    onClick={() => handle(async () => {
                      const { res, data } = await apiPost(`/documents/${params.id}/approvals/${myApproval.id}/request-changes`, { notes: approvalNotes });
                      if (res.ok) { toast.success("Changes requested."); setMyApproval(null); await load(); }
                      else toast.error(data?.error?.message ?? "Failed");
                    })}>
                    Request Changes
                  </Button>
                  <Button variant="destructive" className="font-semibold" disabled={acting}
                    onClick={() => handle(async () => {
                      const { res, data } = await apiPost(`/documents/${params.id}/approvals/${myApproval.id}/reject`, { notes: approvalNotes });
                      if (res.ok) { toast.success("Rejected."); setMyApproval(null); await load(); }
                      else toast.error(data?.error?.message ?? "Failed");
                    })}>
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {canRecommend && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">
                  Add your recommendation before this document is submitted.
                </p>
                <textarea rows={3} placeholder="Enter your recommendation notes (required)..."
                  value={recommendNotes} onChange={e => setRecommendNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
                <Button className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-semibold" disabled={acting}
                  onClick={() => handle(async () => {
                    if (!recommendNotes.trim()) { toast.error("Recommendation notes are required"); return; }
                    const { res, data } = await apiPost(`/documents/${params.id}/recommend`, { notes: recommendNotes });
                    if (res.ok) { toast.success("Recommendation submitted!"); setRecommendNotes(""); await load(); }
                    else toast.error(data?.error?.message ?? "Failed to submit recommendation");
                  })}>
                  {acting ? "Submitting..." : "Submit Recommendation"}
                </Button>
              </div>
            )}

            {isRecommenderWaiting && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-sm text-amber-700 font-medium">✅ Your recommendation has been recorded.</p>
                <p className="text-xs text-amber-600 mt-1">This document is now awaiting agreement from the assigned approvers.</p>
              </div>
            )}

            {canFinalize && (
              <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={acting}
                onClick={() => handle(async () => {
                  const { res, data } = await apiPost(`/documents/${params.id}/finalize`);
                  if (res.ok) { toast.success("Document finalized and added to Ledger!"); await load(); }
                  else toast.error(data?.error?.message ?? "Finalize failed");
                })}>
                {acting ? "Finalizing..." : "Finalize Decision"}
              </Button>
            )}

            {canComplete && (
              <div className="space-y-3">
                <textarea rows={2} placeholder="Execution notes (required)..."
                  value={execNotes} onChange={e => setExecNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
                <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={acting}
                  onClick={() => handle(async () => {
                    if (!execNotes.trim()) { toast.error("Execution notes are required"); return; }
                    const { res, data } = await apiPost(`/documents/${params.id}/execution-complete`, { notes: execNotes });
                    if (res.ok) { toast.success("Execution marked complete!"); await load(); }
                    else toast.error(data?.error?.message ?? "Failed");
                  })}>
                  {acting ? "Saving..." : "Mark Execution Complete"}
                </Button>
              </div>
            )}

            {canVersion && (
              <Button className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-semibold" disabled={acting}
                onClick={() => handle(async () => {
                  const { res, data } = await apiPost(`/documents/${params.id}/version`);
                  if (res.ok) { toast.success("New version created!"); router.push(`/documents/${data.id}`); }
                  else toast.error(data?.error?.message ?? "Failed");
                })}>
                {acting ? "Creating..." : `Create New Version (v${(doc.version ?? 1) + 1})`}
              </Button>
            )}

            {!canSubmit && !canAgree && !canFinalize && !canComplete && !canVersion && !canRecommend && !isRecommenderWaiting && (
              <p className="text-sm text-slate-400 text-center py-2">
                No actions available for your role at this stage.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Document Details */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Decision Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Decision Summary",       value: doc.decisionSummary },
              { label: "Business Context",       value: doc.businessContext },
              { label: "Problem Statement",      value: doc.problemStatement },
              { label: "Proposed Decision",      value: doc.proposedDecision },
              { label: "Alternatives Considered",value: doc.alternativesConsidered },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
              </div>
            ) : null)}

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Risk Level</p>
                <p className="text-sm font-semibold capitalize text-slate-800">{doc.riskLevel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-semibold text-slate-800">{doc.department ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Deadline</p>
                <p className="text-sm font-semibold text-slate-800">
                  {doc.deadline ? new Date(doc.deadline).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Compliance</p>
                {doc.complianceImpact
                  ? <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Yes</span>
                  : <span className="text-sm text-slate-400">No</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RAPID Roles */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">RAPID Roles</CardTitle>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <p className="text-sm text-slate-400">No roles assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {roles.map((r: any, i: number) => {
                  const cfg = ROLE_CONFIG[r.roleType] ?? { label: r.roleType, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" };
                  const isMe = r.userId === myId;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg}`}>
                      <span className={`text-xs font-bold w-32 flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm text-slate-700 font-medium">{r.user?.name ?? r.name ?? r.userId}</span>
                      <span className="text-xs text-slate-400">{r.user?.email}</span>
                      {isMe && (
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${cfg.color} bg-white border`}>
                          YOU
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evidence */}
        {(doc.evidence ?? []).length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {doc.evidence.map((ev: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                    {ev.description && <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>}
                  </div>
                  {ev.urlOrPath && (
                    <a href={ev.urlOrPath} target="_blank" rel="noreferrer"
                      className="text-xs text-primary font-semibold hover:underline ml-4 flex-shrink-0">
                      View →
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
