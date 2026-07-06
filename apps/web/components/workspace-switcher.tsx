"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  memberCount: number;
  accessType: "admin" | "member";
  isActive: boolean;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ workspaces: Workspace[] }>("/orgs/mine");
      setWorkspaces(data.workspaces ?? []);
    } catch {
      // silent — if this fails, switcher just won't render usefully
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function switchTo(id: string) {
    if (switching) return;
    setSwitching(true);
    try {
      await api.post(`/orgs/${id}/switch`, {});
      setOpen(false);
      router.refresh();
      // Full reload ensures every page's org-scoped data (documents, members, etc.) re-fetches cleanly
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  if (!loaded || workspaces.length === 0) return null;

  const active = workspaces.find(w => w.isActive) ?? workspaces[0];

  // Single workspace — show as a static label, no need for a dropdown
  if (workspaces.length === 1) {
    return (
      <span className="px-3 py-1.5 text-sm font-medium text-muted-foreground truncate max-w-[160px]">
        {active.name}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors max-w-[180px]"
      >
        <span className="truncate">{active.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-background border rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Your workspaces
          </div>
          {workspaces.map(w => (
            <button
              key={w.id}
              onClick={() => switchTo(w.id)}
              disabled={switching || w.isActive}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                w.isActive ? "bg-muted cursor-default" : "hover:bg-muted"
              }`}
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{w.name}</div>
                <div className="text-xs text-muted-foreground">
                  {w.memberCount} member{w.memberCount === 1 ? "" : "s"} · {w.accessType}
                </div>
              </div>
              {w.isActive && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-primary">
                  <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
