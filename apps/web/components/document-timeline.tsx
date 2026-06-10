"use client";

interface AuditEntry {
  id?: string;
  action?: string;
  details?: string;
  createdAt?: string;
  user?: { name?: string; email?: string };
}

export function DocumentTimeline({ entries }: { entries: AuditEntry[] }) {
  if (!entries?.length) return null;
  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={e.id ?? i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm font-medium text-slate-800">{e.action ?? "Action"}</p>
            {e.details && <p className="text-xs text-slate-500 mt-0.5">{e.details}</p>}
            <div className="flex items-center gap-2 mt-1">
              {e.user?.name && <span className="text-xs text-slate-400">{e.user.name}</span>}
              {e.createdAt && (
                <span className="text-xs text-slate-400">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
