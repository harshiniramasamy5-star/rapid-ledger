"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/api";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { useMyPendingTasks } from "@/hooks/use-tasks";
import { useMe } from "@/hooks/use-me";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// roles: null = visible to everyone; otherwise gated to those roles
const PRIMARY_LINKS: { href: string; label: string; roles: string[] | null }[] = [
  { href: "/dashboard", label: "Dashboard", roles: null },
  { href: "/tasks", label: "Tasks", roles: null },
  { href: "/approvals", label: "Approvals", roles: null },
  { href: "/ledger", label: "Ledger", roles: null },
  { href: "/audit-log", label: "Audit", roles: null },
  { href: "/chatcl", label: "ChatCL", roles: null },
];

const ADMIN_LINKS: { href: string; label: string }[] = [
  { href: "/admin", label: "Users & Access" },
  { href: "/admin/meetings", label: "Meetings" },
  { href: "/admin/fathom-meetings", label: "Fathom Meetings" },
  { href: "/admin/webhook-logs", label: "Webhook Logs" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  creator: "bg-blue-100 text-blue-700",
  approver: "bg-amber-100 text-amber-700",
  decider: "bg-purple-100 text-purple-700",
  performer: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-700",
};

const HIDDEN = ["/login", "/"];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthed = typeof window !== "undefined" && !!getToken();
  const { data: tasks } = useMyPendingTasks(isAuthed);
  const { data: me } = useMe();
  const taskCount = tasks?.length ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  if (HIDDEN.includes(pathname)) return null;
  if (!isAuthed) return null;

  const logout = () => {
    clearAuth();
    router.replace("/login");
  };

  const isAdmin = me?.role === "admin";
  const visibleLinks = PRIMARY_LINKS.filter((l) => !l.roles || (me && l.roles.includes(me.role)));
  const adminActive = ADMIN_LINKS.some((l) => pathname.startsWith(l.href));

  function linkClasses(href: string) {
    return `relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
      pathname.startsWith(href)
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted"
    }`;
  }

  return (
    <nav className="border-b bg-background relative">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand + desktop links */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-bold mr-2 whitespace-nowrap">RAPID Ledger</span>
          <span className="hidden md:block">
            <WorkspaceSwitcher />
          </span>
          <span className="hidden md:block w-px h-5 bg-border mx-2 flex-shrink-0" />
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {visibleLinks.map((l) => (
              <Link key={l.href} href={l.href} className={linkClasses(l.href)}>
                {l.label}
                {l.href === "/tasks" && taskCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                    {taskCount > 99 ? "99+" : taskCount}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <button
                    className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      adminActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Admin ▾
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuGroup>
                    {ADMIN_LINKS.map((l) => (
                      <DropdownMenuItem key={l.href} onClick={() => router.push(l.href)} className="text-sm font-medium">
                        {l.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Right side: notifications + user menu (desktop), hamburger (mobile) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="hidden md:flex items-center gap-1">
            <NotificationBell />
            <Separator orientation="vertical" className="h-5 mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors select-none"
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-bold">{me?.name?.[0] ?? "U"}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold leading-none">{me?.name}</p>
                    {me?.role && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${ROLE_BADGE[me.role] ?? ""}`}>
                        {me.role}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem className="text-sm font-medium">{me?.email}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/orgs")} className="text-sm font-medium">
                    🏢 Organisation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 text-sm font-medium">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>

          {/* Mobile: bell always visible + hamburger toggle */}
          <span className="md:hidden flex items-center gap-1">
            <NotificationBell />
            <button
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </span>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background shadow-lg">
          <div className="px-4 py-3 space-y-3">
            <WorkspaceSwitcher />
            <div className="flex flex-col gap-1">
              {visibleLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(l.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                  {l.href === "/tasks" && taskCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                      {taskCount > 99 ? "99+" : taskCount}
                    </span>
                  )}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <p className="px-3 pt-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Admin</p>
                  {ADMIN_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname.startsWith(l.href) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {l.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">{me?.name?.[0] ?? "U"}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none">{me?.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{me?.email}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { setMobileOpen(false); router.push("/orgs"); }}
                className="text-left px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                🏢 Organisation
              </button>
              <button
                onClick={logout}
                className="text-left px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
