"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/api";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

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

  if (HIDDEN.includes(pathname)) return null;
  if (typeof window !== "undefined" && !getToken()) return null;

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
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {l.label}
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
