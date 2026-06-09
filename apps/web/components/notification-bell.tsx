"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;}

interface Notification {
  id: string;
  action: string;
  entityId: string;
  documentId?: string;
  createdAt: string;
  details?: string;
}

const ACTION_LABELS: Record<string, string> = {
  document_approved:   "Document approved",
  document_rejected:   "Document rejected",
  changes_requested:   "Changes requested",
  document_submitted:  "Document submitted for review",
  invite_accepted:     "Team member joined",
  transcript_imported: "Meeting transcript imported",
  webhook_retried:     "Integration dispatched",
};

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("rapid_last_seen") ?? new Date().toISOString();
    return new Date().toISOString();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifications() {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const all: Notification[] = Array.isArray(data) ? data : (data.logs ?? data.data ?? []);
      const relevant = all.filter(n => ACTION_LABELS[n.action]).slice(0, 20);
      setNotifications(relevant);
      const newCount = relevant.filter(n => n.createdAt > lastSeen).length;
      setUnread(newCount);
    } catch {}
  }

  function markAllRead() {
    const now = new Date().toISOString();
    setLastSeen(now);
    setUnread(0);
    if (typeof window !== "undefined") localStorage.setItem("rapid_last_seen", now);
  }

  function handleOpen() {
    setOpen(o => !o);
    if (!open) markAllRead();
  }

  function formatTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
            )}
            {notifications.map(n => (
              <div key={n.id}
                onClick={() => { if (n.documentId) { router.push(`/documents/${n.documentId}`); setOpen(false); } }}
                className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${n.createdAt > lastSeen ? "bg-indigo-50/50" : ""}`}>
                <p className="text-sm text-slate-700">{ACTION_LABELS[n.action] ?? n.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatTime(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
