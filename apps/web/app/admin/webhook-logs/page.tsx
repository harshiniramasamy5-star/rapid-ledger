"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;}

interface WebhookLog {
  id: string;
  action: string;
  entityId: string;
  documentId?: string;
  details: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function WebhookLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all"|"success"|"failed">("success");

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/audit-logs`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await res.json();
      const all: WebhookLog[] = Array.isArray(data) ? data : (data.logs ?? data.data ?? []);
      setLogs(all.filter((l: WebhookLog) => 
        l.action === "webhook_failed" || l.action === "webhook_retried"
      ));
    } finally { setLoading(false); }
  }

  const filtered = logs.filter(l => {
    if (filter === "success") return l.action === "webhook_retried";
    if (filter === "failed") return l.action === "webhook_failed";
    return true;
  });

  function parseDetails(raw: string) {
    try { return JSON.parse(raw); } catch { return {}; }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  const successCount = logs.filter(l => l.action === "webhook_retried").length;
  const failedCount = logs.filter(l => l.action === "webhook_failed").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Delivery Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatches to Notion, Linear, and external integrations on document approval.
          </p>
        </div>
        <button onClick={loadLogs} disabled={loading}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Dispatches</p>
        </div>
        <div className="border border-green-200 rounded-xl p-4 bg-green-50">
          <p className="text-2xl font-bold text-green-700">{successCount}</p>
          <p className="text-xs text-green-600 mt-1">Successful</p>
        </div>
        <div className="border border-red-200 rounded-xl p-4 bg-red-50">
          <p className="text-2xl font-bold text-red-700">{failedCount}</p>
          <p className="text-xs text-red-600 mt-1">Failed</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all","success","failed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border border-gray-200 rounded-xl p-10 text-center bg-gray-50">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm text-gray-500">No webhook dispatches yet. Approve a document to trigger integrations.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(log => {
            const details = parseDetails(log.details);
            const isSuccess = log.action === "webhook_retried";
            return (
              <div key={log.id}
                className={`border rounded-xl p-4 bg-white flex items-start gap-4 ${
                  isSuccess ? "border-green-200" : "border-red-200"
                }`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {isSuccess ? "✓" : "✗"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {details.integration?.toUpperCase() ?? "WEBHOOK"}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                    {log.documentId && (
                      <button onClick={() => router.push(`/documents/${log.documentId}`)}
                        className="text-xs text-indigo-600 hover:underline">
                        View Document →
                      </button>
                    )}
                  </div>
                  {isSuccess && details.issueIdentifier && (
                    <p className="text-sm text-gray-700">
                      Linear issue created:{" "}
                      <a href={details.issueUrl} target="_blank" rel="noreferrer"
                        className="text-indigo-600 font-medium hover:underline">
                        {details.issueIdentifier}
                      </a>
                    </p>
                  )}
                  {!isSuccess && details.error && (
                    <p className="text-sm text-red-600 font-mono truncate">{details.error}</p>
                  )}
                  {details.event && (
                    <p className="text-xs text-gray-400 mt-1">Event: {details.event}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
