"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/api";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { useMyPendingTasks } from "@/hooks/use-tasks";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/approvals", label: "Approvals" },
  { href: "/ledger", label: "Ledger" },
  { href: "/audit-log", label: "Audit" },
  { href: "/chatcl", label: "ChatCL" },
];

const HIDDEN = ["/login", "/"];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthed = typeof window !== "undefined" && !!getToken();
  const { data: tasks } = useMyPendingTasks(isAuthed);
  const taskCount = tasks?.length ?? 0;

  if (HIDDEN.includes(pathname)) return null;
  if (!isAuthed) return null;

  const logout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <nav className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-bold mr-2">RAPID Ledger</span>
          <WorkspaceSwitcher />
          <span className="w-px h-5 bg-border mx-2" />
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {l.label}
              {l.href === "/tasks" && taskCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                  {taskCount > 99 ? "99+" : taskCount}
                </span>
              )}
            </Link>
          ))}
        </div>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
