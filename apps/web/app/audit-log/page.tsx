"use client"

function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;};
import { useEffect, useState } from "react";
import type { AuditEntry, ApiUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  document_created:     { label: "Document Created",     color: "text-indigo-700",  bg: "bg-indigo-50"  },
  document_updated:     { label: "Document Updated",     color: "text-amber-700",   bg: "bg-amber-50"   },
  role_assigned:        { label: "Role Assigned",        color: "text-purple-700",  bg: "bg-purple-50"  },
  evidence_added:       { label: "Evidence Added",       color: "text-cyan-700",    bg: "bg-cyan-50"    },
  document_submitted:   { label: "Document Submitted",   color: "text-blue-700",    bg: "bg-blue-50"    },
  approval_added:       { label: "Approval Recorded",    color: "text-emerald-700", bg: "bg-emerald-50" },
  document_rejected:    { label: "Document Rejected",    color: "text-red-700",     bg: "bg-red-50"     },
  changes_requested:    { label: "Changes Requested",    color: "text-orange-700",  bg: "bg-orange-50"  },
  document_finalized:   { label: "Document Finalized",   color: "text-emerald-700", bg: "bg-emerald-50" },
  ledger_entry_created: { label: "Ledger Entry Created", color: "text-indigo-700",  bg: "bg-indigo-50"  },
  version_created:      { label: "Version Created",      color: "text-pink-700",    bg: "bg-pink-50"    },
  execution_completed:  { label: "Execution Completed",  color: "text-emerald-700", bg: "bg-emerald-50" },
};

const ROLE_COLORS: Record<string, string> = {
  admin:          "bg-red-100 text-red-700",
  creator:        "bg-blue-100 text-blue-700",
  approver:       "bg-amber-100 text-amber-700",
  decision_owner: "bg-purple-100 text-purple-700",
  performer:      "bg-green-100 text-green-700",
  viewer:        "bg-gray-100 text-gray-700",
};

function relativeTime(iso: string) {
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1)  return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export default function AuditLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [me, setMe]           = useState<ApiUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/login"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setMe).catch(() => {});

    const url = filter === "all"
      ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/audit`
      : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/audit?action=${filter}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { toast.error("Failed to load audit log"); setLoading(false); });
  }, [router, filter]);

  const actionTypes = Array.from(new Set(entries.map(e => e.action)));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">RAPID Ledger</p>
              <p className="text-xs text-slate-400 mt-0.5">Decision governance without compromise</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{me.name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_COLORS[me.role] ?? "bg-gray-100 text-gray-700"}`}>
                  {me.role}
                </span>
              </div>
            )}
            <Separator orientation="vertical" className="h-5" />
            <Button variant="ghost" size="sm" className="text-slate-500"
              onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
            <p className="text-slate-500 text-sm mt-1">
              Every major action on every RAPID document, in chronological order.
            </p>
          </div>
          <Badge variant="outline" className="text-slate-500 border-slate-200 mt-1">
            {entries.length} entries
          </Badge>
        </div>

        {/* Filter pills */}
        {!loading && actionTypes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}>
              All ({entries.length})
            </button>
            {actionTypes.map(action => {
              const cfg = ACTION_CONFIG[action];
              return (
                <button key={action}
                  onClick={() => setFilter(action)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    filter === action
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}>
                  {cfg?.label ?? action}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading audit entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-slate-900">No audit entries yet</h3>
              <p className="text-slate-400 text-sm mt-1">Actions will appear here as users interact with documents.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {entries.map((e, i) => {
                const cfg = ACTION_CONFIG[e.action] ?? { label: e.action, color: "text-slate-700", bg: "bg-slate-100" };
                return (
                  <div key={e.id}
                    onClick={() => e.documentCode && router.push(`/documents/${e.entityId}`)}
                    className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                      e.documentCode ? "cursor-pointer hover:bg-slate-50" : ""
                    } ${i !== entries.length - 1 ? "border-b border-slate-100" : ""}`}>

                    {/* Action dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${cfg.bg.replace("bg-","bg-").replace("50","400")}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {e.documentCode && (
                          <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {e.documentCode}
                          </span>
                        )}
                      </div>
                      {e.documentTitle && (
                        <p className="text-sm text-slate-700 font-medium truncate mb-1">{e.documentTitle}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${ROLE_COLORS[e.user?.role ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                          {e.user?.role}
                        </span>
                        <span className="font-medium text-slate-600">{e.user?.name ?? "Unknown"}</span>
                        <span>·</span>
                        <span title={new Date(e.createdAt).toLocaleString()}>
                          {relativeTime(e.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Showing latest {entries.length} entries · Audit log is immutable and read-only
        </p>
      </main>
    </div>
  );
}
