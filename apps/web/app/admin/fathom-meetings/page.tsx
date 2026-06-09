"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken() {
  const m = document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : null;
}

interface FathomMeeting {
  id: string;
  title: string;
  started_at: string;
  ended_at?: string;
  attendees?: Array<{ email: string; name: string }>;
  duration_minutes?: number;
}

type ImportState = "idle" | "importing" | "done";

export default function FathomMeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<FathomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({});
  const [importResults, setImportResults] = useState<Record<string, string>>({});

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/integrations/fathom/meetings`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Failed to load meetings");
        setMeetings([]);
      } else {
        setMeetings(data.meetings ?? []);
        if ((data.meetings ?? []).length === 0 && !data.error) {
          setError("no_meetings");
        }
      }
    } catch {
      setError("Network error — check connection");
    } finally {
      setLoading(false);
    }
  }

  async function importMeeting(meetingId: string, title: string) {
    setImportStates(s => ({ ...s, [meetingId]: "importing" }));
    try {
      const res = await fetch(`${API}/integrations/fathom/import/${meetingId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? data?.error ?? "Import failed");
        setImportStates(s => ({ ...s, [meetingId]: "idle" }));
      } else {
        setImportStates(s => ({ ...s, [meetingId]: "done" }));
        setImportResults(r => ({ ...r, [meetingId]: data.documentCode ?? "imported" }));
        toast.success(`Imported as ${data.documentCode} — ${data.participantCount ?? 0} participants`);
      }
    } catch {
      toast.error("Network error");
      setImportStates(s => ({ ...s, [meetingId]: "idle" }));
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function isRapid(title: string) {
    return title?.startsWith("[RAPID]");
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fathom Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a meeting to import its transcript into RAPID Ledger.
            Meetings prefixed with{" "}
            <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">[RAPID]</span>{" "}
            are auto-imported via webhook.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/meetings")}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Manual Paste ↗
          </button>
          <button
            onClick={loadMeetings}
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Fetching meetings from Fathom…</p>
          </div>
        </div>
      )}

      {/* No meetings / Team plan required */}
      {!loading && error === "no_meetings" && (
        <div className="border border-gray-200 rounded-xl p-10 text-center bg-gray-50">
          <div className="text-4xl mb-4">🎙️</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No meetings found</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            The Fathom meeting list API requires a Team plan. On the free plan,
            use the <strong>Manual Paste</strong> page to import transcripts directly.
          </p>
          <button
            onClick={() => router.push("/admin/meetings")}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Go to Manual Import →
          </button>
        </div>
      )}

      {/* Error */}
      {!loading && error && error !== "no_meetings" && (
        <div className="border border-red-200 rounded-xl p-6 bg-red-50 text-center">
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <button onClick={loadMeetings} className="text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Meetings list */}
      {!loading && !error && meetings.length > 0 && (
        <div className="space-y-3">
          {meetings.map(m => {
            const state = importStates[m.id] ?? "idle";
            const resultCode = importResults[m.id];
            const rapid = isRapid(m.title ?? "");

            return (
              <div
                key={m.id}
                className={`border rounded-xl p-5 bg-white flex items-start justify-between gap-4 ${
                  rapid ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {rapid && (
                      <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        [RAPID]
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {rapid ? m.title.replace("[RAPID]", "").trim() : m.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {m.started_at ? formatDate(m.started_at) : "Unknown date"}</span>
                    {m.duration_minutes && <span>⏱ {m.duration_minutes}m</span>}
                    {m.attendees && m.attendees.length > 0 && (
                      <span>👥 {m.attendees.length} attendees</span>
                    )}
                  </div>
                  {m.attendees && m.attendees.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {m.attendees.map(a => a.name || a.email).join(", ")}
                    </p>
                  )}
                  {resultCode && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      ✓ Imported as {resultCode}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {state === "done" ? (
                    <button
                      onClick={() => router.push("/documents")}
                      className="px-4 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                    >
                      View →
                    </button>
                  ) : (
                    <button
                      onClick={() => importMeeting(m.id, m.title)}
                      disabled={state === "importing"}
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {state === "importing" ? "Importing…" : "Import →"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer tip */}
      {!loading && (
        <p className="text-xs text-gray-400 text-center mt-8">
          Tip: Name your Fathom meetings with{" "}
          <span className="font-mono">[RAPID]</span> prefix to auto-import via webhook.
        </p>
      )}
    </div>
  );
}
