"use client";
import React from "react";
import { useEffect, useState } from "react";
import type { ApiDocument, ApiUser, Approval, RoleAssignment } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [doc, setDoc]               = useState<ApiDocument | null>(null);
  const [me, setMe]                 = useState<ApiUser | null>(null);
  const [myApproval, setMyApproval] = useState<Approval | null>(null);
  const [approvalNotes, setApprovalNotes]     = useState("");
  const [execNotes, setExecNotes]             = useState("");
  const [recommendNotes, setRecommendNotes]   = useState("");
  const [inputNotes, setInputNotes]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState(false);

  function token() { return localStorage.getItem("rapid_token") ?? ""; }

  const load = React.useCallback(async () => {
    try {
      const t = token();
      if (!t) { router.replace("/login"); return; }
      const [meRes, docRes, appRes] = await Promise.all([
        fetch(`${API}/auth/me`,            { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/documents/${params.id}`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/approvals/my`,       { headers: { Authorization: `Bearer ${t}` } }).catch(() => new Response('[]')),
      ]);
      const [meData, docData, appData] = await Promise.all([meRes.json(), docRes.json(), appRes.json()]);
      const found = Array.isArray(appData) ? (appData as Approval[]).find(a => a.documentId === params.id || a.document?.id === params.id) : null;
      // batch state updates to avoid cascading renders
      React.startTransition(() => {
        setMe(meData);
        setDoc(docData?.error ? null : docData);
        setMyApproval(found ?? null);
        setLoading(false);
      });
    } catch { toast.error("Failed to load document"); setLoading(false); }
  }, [params.id, router]);

  useEffect(() => { void load(); }, [load]);

  async function apiPost(path: string, body?: Record<string, unknown>) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text(); let data: unknown; try { data = JSON.parse(text); } catch { data = { error: { message: text } }; } return { res, data };
  }

  async function handle(action: () => Promise<void>) {
    setActing(true);
    try { await action(); } catch (e: unknown) { toast.error((e instanceof Error ? e.message : undefined) ?? "Something went wrong"); }
    setActing(false);
  }

  const myId    = me?.id ?? "";
  const roles   = doc?.roleAssignments ?? [];
  const myRole  = (roles as RoleAssignment[]).find(r => r.userId === myId);
  const isCreator   = (typeof doc?.createdBy === "object" ? (doc?.createdBy as ApiUser)?.id : doc?.createdBy) === myId;
  const status      = doc?.status ?? "";

  const canSubmit   = isCreator && ["draft","needs_changes"].includes(status);
  const canEdit     = isCreator && ["draft","needs_changes"].includes(status); // EDIT_BUTTON_ADDED
  const canAgree    = !!myApproval && ["submitted","awaiting_agreement"].includes(status);
  const canFinalize = me?.role === "admin" && status === "approved";

  async function exportPdf() {
    const token = localStorage.getItem("rapid_token");
    if (!token || !doc) return;
    const res = await fetch(`${API}/documents/${doc.id}/export-pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { toast.error("Failed to export PDF"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.documentCode}-v${doc.version}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const canComplete = myRole?.roleType === "perform" && status === "finalized";
  const canVersion  = me?.role === "admin" && ["finalized","execution_complete"].includes(status);
  const isRecommenderWaiting = myRole?.roleType === "recommend" && !!doc?.recommendationNotes && status === "awaiting_agreement";
  const canInput        = myRole?.roleType === "input" && !doc?.inputNotes && ["draft","needs_changes","submitted","awaiting_agreement"].includes(status);
  const isInputWaiting  = myRole?.roleType === "input" && !!doc?.inputNotes;
  const canRecommend = myRole?.roleType === "recommend" && !isRecommenderWaiting && ["draft","needs_changes","submitted","awaiting_agreement"].includes(status);

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
              <p className="text-xs text-slate-400 mt-0.5">Decision governance without compromise</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc && ["finalized","execution_complete"].includes(doc.status) && (
              <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={exportPdf}>
                ↓ Export PDF
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-slate-500"
              onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
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
            {canEdit && (
              <Button
                variant="outline"
                className="w-full mb-2"
                onClick={() => router.push(`/documents/${params.id}/edit`)}
              >
                Edit Document
              </Button>
            )}
            {canSubmit && (
              <Button className="w-full h-11 font-semibold" disabled={acting}
                onClick={() => handle(async () => {
                  const { res, data } = await apiPost(`/documents/${params.id}/submit`);
                  if (res.ok) { toast.success("Document submitted for approval!"); await load(); }
                  else { toast.error(data?.error?.message ?? data?.message ?? "Failed to submit document"); }
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
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 py-2 disabled:opacity-50" disabled={acting}>Approve</AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve this document?</AlertDialogTitle>
                        <AlertDialogDescription>This will mark your agreement. The decision owner will be notified.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handle(async () => {
                          const { res, data } = await apiPost(`/documents/${params.id}/approve`, { comment: approvalNotes });
                          if (res.ok) { toast.success("Approved!"); setMyApproval(null); await load(); }
                          else toast.error(data?.error?.message ?? "Failed");
                        })}>Confirm Approve</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold" disabled={acting}
                    onClick={() => handle(async () => {
                      const { res, data } = await apiPost(`/documents/${params.id}/needs-changes`, { comment: approvalNotes });
                      if (res.ok) { toast.success("Changes requested."); setMyApproval(null); await load(); }
                      else toast.error(data?.error?.message ?? "Failed");
                    })}>
                    Request Changes
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2 disabled:opacity-50" disabled={acting}>Reject</AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject this document?</AlertDialogTitle>
                        <AlertDialogDescription>This action will reject the document. The creator will be notified to revise.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handle(async () => {
                          const { res, data } = await apiPost(`/documents/${params.id}/reject`, { comment: approvalNotes });
                          if (res.ok) { toast.success("Rejected."); setMyApproval(null); await load(); }
                          else toast.error(data?.error?.message ?? "Failed");
                        })}>Confirm Reject</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

            {canInput && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium">
                  Provide your input or expertise to support this decision.
                </p>
                <textarea rows={3} placeholder="Enter your input notes (required)..."
                  value={inputNotes} onChange={e => setInputNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
                <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold" disabled={acting}
                  onClick={() => handle(async () => {
                    if (!inputNotes.trim()) { toast.error("Input notes are required"); return; }
                    const { res, data } = await apiPost(`/documents/${params.id}/input`, { notes: inputNotes });
                    if (res.ok) { toast.success("Input submitted!"); setInputNotes(""); await load(); }
                    else toast.error(data?.error?.message ?? "Failed to submit input");
                  })}>
                  {acting ? "Submitting..." : "Submit Input"}
                </Button>
              </div>
            )}

            {isInputWaiting && (
              <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3">
                <p className="text-sm text-teal-700 font-medium">✅ Your input has been recorded.</p>
                <p className="text-xs text-teal-600 mt-1">Thank you for providing your expertise to support this decision.</p>
              </div>
            )}

            {canFinalize && (
              <AlertDialog>
                <AlertDialogTrigger className="w-full inline-flex items-center justify-center rounded-md text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-4 py-2 disabled:opacity-50" disabled={acting}>{acting ? "Finalizing..." : "Finalize Decision"}</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalize this decision?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This is irreversible. The document will be locked and added to the permanent ledger.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handle(async () => {
                      const { res, data } = await apiPost(`/documents/${params.id}/finalize`);
                      if (res.ok) { toast.success("Document finalized and added to Ledger!"); await load(); }
                      else toast.error(data?.error?.message ?? "Finalize failed");
                    })}>Confirm Finalize</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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

            {!canEdit && !canSubmit && !canAgree && !canFinalize && !canComplete && !canVersion && !canRecommend && !isRecommenderWaiting && !canInput && !isInputWaiting && (
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
                {(roles as import('@/lib/types').RoleAssignment[]).map((r, i) => {
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
              {(doc.evidence as import('@/lib/types').Evidence[]).map((ev, i) => (
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
