"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;}

interface TranscriptDoc {
  id: string;
  title: string;
  documentCode: string;
  createdAt: string;
  status: string;
  roleAssignments: Array<{ user: { name: string; email: string }; roleType: string }>;
}

export default function FathomMeetingsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<TranscriptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadTranscripts(); }, []);

  async function loadTranscripts() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/documents?documentType=TRANSCRIPT&limit=20`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) { setError("Failed to load transcripts"); return; }
      const all = data.documents ?? data.data ?? [];
      setDocs(all);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Transcripts</h1>
          <p className="text-sm text-gray-500 mt-1">
            All imported meeting transcripts. Prefix meetings with{" "}
            <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">[RAPID]</span>{" "}
            to auto-import via webhook.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/admin/meetings")}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            + Import New
          </button>
          <button onClick={loadTranscripts} disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"/>
            <p className="text-sm text-gray-500">Loading transcripts…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="border border-red-200 rounded-xl p-6 bg-red-50 text-center">
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <button onClick={loadTranscripts} className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-100">Retry</button>
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="border border-gray-200 rounded-xl p-10 text-center bg-gray-50">
          <div className="text-4xl mb-4">🎙️</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No transcripts yet</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            Import your first meeting transcript from Fathom or any other tool.
          </p>
          <button onClick={() => router.push("/admin/meetings")}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Import Meeting →
          </button>
        </div>
      )}

      {!loading && !error && docs.length > 0 && (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{doc.documentCode}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${doc.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {doc.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {doc.title.replace("[RAPID]", "").replace("[Transcript]", "").trim()}
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                  <span>📅 {formatDate(doc.createdAt)}</span>
                  {doc.roleAssignments?.length > 0 && (
                    <span>👥 {doc.roleAssignments.length} participants</span>
                  )}
                </div>
                {doc.roleAssignments?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {doc.roleAssignments.map(ra => `${ra.user.name} (${ra.roleType})`).join(", ")}
                  </p>
                )}
              </div>
              <button onClick={() => router.push(`/documents/${doc.id}`)}
                className="shrink-0 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap">
                View →
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-8">
        Tip: Name meetings with <span className="font-mono">[RAPID]</span> prefix to auto-import via webhook.
      </p>
    </div>
  );
}
