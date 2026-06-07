"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FathomMeeting {
  id: string;
  title: string;
  startedAt: string;
  duration: number;
  participants: number;
  hasTranscript: boolean;
  isRapid: boolean;
  url?: string;
}

export default function MeetingImportsPage() {
  const [meetings, setMeetings] = useState<FathomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/integrations/fathom/meetings", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setMeetings(d.meetings ?? []);
      })
      .catch(() => setError("Failed to load meetings"))
      .finally(() => setLoading(false));
  }, []);

  const handleImport = async (meetingId: string, title: string) => {
    setImporting(meetingId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/integrations/fathom/import/${meetingId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else {
        setSuccess(`Imported "${title}" as ${d.documentCode}`);
        setTimeout(() => router.push("/documents"), 1500);
      }
    } catch {
      setError("Import failed");
    } finally {
      setImporting(null);
    }
  };

  const fmt = (iso: string) =>
    iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const fmtDuration = (secs: number) => {
    if (!secs) return "—";
    const m = Math.floor(secs / 60);
    return `${m} min`;
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meeting Imports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manually import Fathom meetings into RAPID Ledger. Meetings tagged{" "}
          <span className="font-mono bg-gray-100 px-1 rounded">[RAPID]</span> are imported automatically via webhook.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✓ {success} — redirecting to documents...
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading meetings from Fathom...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No recent meetings found</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Participants</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Transcript</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meetings.map((m) => (
                <tr key={m.id} className={m.isRapid ? "bg-indigo-50" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.isRapid && (
                        <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                          AUTO
                        </span>
                      )}
                      <span className="font-medium text-gray-900 truncate max-w-xs">{m.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(m.startedAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDuration(m.duration)}</td>
                  <td className="px-4 py-3 text-gray-500">{m.participants}</td>
                  <td className="px-4 py-3">
                    {m.hasTranscript ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Available</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.isRapid ? (
                      <span className="text-xs text-gray-400">Auto-imported</span>
                    ) : (
                      <button
                        onClick={() => handleImport(m.id, m.title)}
                        disabled={!m.hasTranscript || importing === m.id}
                        className="text-xs font-medium px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {importing === m.id ? "Importing..." : "Import"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
