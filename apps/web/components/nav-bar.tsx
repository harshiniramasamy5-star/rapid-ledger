"use client";

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
const LINKS: { href: string; label: string; roles: string[] | null }[] = [
  { href: "/dashboard", label: "Dashboard", roles: null },
  { href: "/tasks", label: "Tasks", roles: null },
  { href: "/approvals", label: "Approvals", roles: null },
  { href: "/ledger", label: "Ledger", roles: null },
  { href: "/audit-log", label: "Audit", roles: null },
  { href: "/chatcl", label: "ChatCL", roles: null },
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/admin/meetings", label: "Meetings", roles: ["admin"] },
  { href: "/admin/fathom-meetings", label: "Fathom", roles: ["admin"] },
  { href: "/admin/webhook-logs", label: "Webhooks", roles: ["admin"] },
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

  if (HIDDEN.includes(pathname)) return null;
  if (!isAuthed) return null;

  const logout = () => {
    clearAuth();
    router.replace("/login");
  };

  const visibleLinks = LINKS.filter((l) => !l.roles || (me && l.roles.includes(me.role)));

  return (
    <nav className="border-b bg-background">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="font-bold mr-2 whitespace-nowrap">RAPID Ledger</span>
          <WorkspaceSwitcher />
          <span className="w-px h-5 bg-border mx-2 flex-shrink-0" />
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
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
        <div className="flex items-center gap-1 flex-shrink-0">
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
        </div>
      </div>
    </nav>
  );
}
