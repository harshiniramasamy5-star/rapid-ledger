"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;}

export default function MeetingImportsPage() {
  const [title, setTitle] = useState("");
  const [emails, setEmails] = useState("");
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Meeting title is required"); return; }
    if (!emails.trim()) { setError("At least one participant email is required"); return; }
    if (!transcript.trim()) { setError("Transcript is required"); return; }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/integrations/fathom/manual`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken() ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          emails: emails.split(",").map((e) => e.trim()).filter(Boolean),
          transcript: transcript.trim(),
        }),
      });
      const d = await res.json();
      if (d.error) {
        setError(d.error);
      } else {
        setSuccess(`✓ Imported as ${d.documentCode} — AI assigned roles to ${d.participantCount} participants`);
        setTimeout(() => router.push("/documents"), 2000);
      }
    } catch {
      setError("Import failed — check connection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manual Meeting Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a Fathom transcript to import it into RAPID Ledger.
          AI will extract decisions and assign RAPID roles automatically.
          Meetings tagged <span className="font-mono bg-gray-100 px-1 rounded">[RAPID]</span> import automatically via webhook.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {success} — redirecting...
        </div>
      )}

      <div className="space-y-5 bg-white border border-gray-200 rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. [RAPID] Q2 Budget Approval"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Participant Emails</label>
          <input
            type="text"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="sanjay@complyance.io, hari@complyance.io, harshini@antna.co.in"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">Comma separated. AI will assign a RAPID role to each.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transcript</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the full meeting transcript from Fathom here..."
            rows={14}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Importing & running AI analysis..." : "Import Meeting"}
        </button>
      </div>
    </div>
  );
}
