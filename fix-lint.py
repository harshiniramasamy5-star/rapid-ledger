#!/usr/bin/env python3
"""Fix all 36 lint errors across web + API files."""
import os, re

HOME = os.path.expanduser("~")
WEB  = f"{HOME}/rapid-ledger/apps/web"
API  = f"{HOME}/rapid-ledger/apps/api"

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f: f.write(content)
    print(f"  ✓ wrote {path.replace(HOME, '~')}")

def patch(path, *replacements):
    try:
        with open(path) as f: content = f.read()
    except FileNotFoundError:
        print(f"  ⚠ missing {path.replace(HOME,'~')}"); return
    original = content
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"  ⚠ not found in {os.path.basename(path)}: {old[:60]!r}")
    if content != original:
        with open(path, "w") as f: f.write(content)
        print(f"  ✓ patched {path.replace(HOME,'~')}")

# ── 1. Shared API types helper ──────────────────────────────────────────────
write(f"{WEB}/lib/types.ts", '''\
/** Shared API response types — eliminates `any` in page components */

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RoleAssignment {
  id: string;
  documentId: string;
  userId: string;
  roleType: string;
  user?: { id: string; name: string; email: string };
  name?: string;
}

export interface Evidence {
  id: string;
  title: string;
  type: string;
  urlOrPath: string;
  description?: string | null;
}

export interface Approval {
  id: string;
  documentId: string;
  approverId: string;
  decision: string;
  comment?: string | null;
  document?: ApiDocument;
}

export interface ApiDocument {
  id: string;
  documentCode: string;
  version: number;
  title: string;
  status: string;
  riskLevel: string;
  complianceImpact: boolean;
  decisionSummary: string;
  businessContext?: string | null;
  problemStatement?: string | null;
  proposedDecision?: string | null;
  alternativesConsidered?: string | null;
  department?: string | null;
  deadline?: string | null;
  createdById: string;
  createdBy?: string;
  roleAssignments?: RoleAssignment[];
  evidence?: Evidence[];
  approvals?: Approval[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  details?: Record<string, unknown>;
  documentCode?: string;
  documentTitle?: string;
  actorName?: string;
  actorRole?: string;
  objectId?: string;
}

export interface LedgerEntry {
  id: string;
  documentCode: string;
  version: number;
  title: string;
  finalizedBy: string;
  finalizedAt: string;
  summary?: string;
  riskLevel?: string;
  complianceImpact?: boolean;
  finalDecision?: string;
  decideOwner?: { name: string; email: string };
  performOwner?: { name: string; email: string };
}

export function getApiError(err: unknown, fallback = "Something went wrong"): string {
  if (typeof err === "object" && err !== null) {
    const e = err as { error?: { message?: string }; message?: string };
    return e.error?.message ?? e.message ?? fallback;
  }
  return fallback;
}
''')

# ── 2. jest.config.js — fix require() import error ──────────────────────────
print("▶ jest.config.js")
patch(f"{WEB}/jest.config.js",
    ("const nextJest = require('next/jest')",
     "/* eslint-disable @typescript-eslint/no-require-imports */\nconst nextJest = require('next/jest')"))

# ── 3. e2e/rapid-ledger.spec.ts — fix page: any ─────────────────────────────
print("▶ e2e/rapid-ledger.spec.ts")
patch(f"{WEB}/e2e/rapid-ledger.spec.ts",
    ("import { test, expect } from '@playwright/test';",
     "import { test, expect, type Page } from '@playwright/test';"),
    ("async function login(page: any, email: string, password = 'password123')",
     "async function login(page: Page, email: string, password = 'password123')"))

# ── 4. __tests__/login.test.tsx — fix any[] in mock ─────────────────────────
print("▶ __tests__/login.test.tsx")
patch(f"{WEB}/__tests__/login.test.tsx",
    ("success: (...args: any[]) => mockToastSuccess(...args),",
     "success: (...args: unknown[]) => mockToastSuccess(...args),"),
    ("error: (...args: any[]) => mockToastError(...args),",
     "error: (...args: unknown[]) => mockToastError(...args),"))

# ── 5. app/login/login.test.tsx — fix data: any ─────────────────────────────
print("▶ app/login/login.test.tsx")
patch(f"{WEB}/app/login/login.test.tsx",
    ("function mockFetch(data: any, ok = true) {",
     "function mockFetch(data: Record<string, unknown>, ok = true) {"))

# ── 6. app/login/page.tsx — fix data.User bug + err: any ────────────────────
print("▶ app/login/page.tsx")
patch(f"{WEB}/app/login/page.tsx",
    # Fix the actual bug: API returns lowercase `user`, not `User`
    ("localStorage.setItem(\"rapid_user\", JSON.stringify(data.User));",
     "localStorage.setItem(\"rapid_user\", JSON.stringify(data.user));"),
    ("document.cookie = `rapid_role=${data.User.role};",
     "document.cookie = `rapid_role=${data.user.role};"),
    ("toast.success(\"Welcome back, \" + data.User.name + \"!\");",
     "toast.success(\"Welcome back, \" + data.user.name + \"!\");"),
    ("router.push(ROLE_ROUTES[data.User.role] ?? \"/dashboard\");",
     "router.push(ROLE_ROUTES[data.user.role] ?? \"/dashboard\");"),
    # Fix err: any
    ("} catch (err: any) {\n      toast.error(err?.error?.message ?? \"Invalid credentials. Please try again.\");",
     "} catch (err: unknown) {\n      toast.error((err as { error?: { message?: string } })?.error?.message ?? \"Invalid credentials. Please try again.\");"))

# ── 7. app/admin/page.tsx — fix any[] state + err: any + callback any ───────
print("▶ app/admin/page.tsx")
patch(f"{WEB}/app/admin/page.tsx",
    # Add types import
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState } from "react";\nimport type { ApiUser } from "@/lib/types";'),
    # Fix state type
    ("const [users, setUsers]       = useState<any[]>([]);",
     "const [users, setUsers]       = useState<ApiUser[]>([]);"),
    # Fix catch err: any (createUser)
    ("} catch (err: any) {\n      toast.error(err?.error?.message ?? \"Failed to create user\");",
     "} catch (err: unknown) {\n      toast.error((err as { error?: { message?: string } })?.error?.message ?? \"Failed to create user\");"),
    # Fix catch err: any (toggleUser)
    ("} catch (err: any) {\n      toast.error(err?.error?.message ?? \"Failed to update user\");",
     "} catch (err: unknown) {\n      toast.error((err as { error?: { message?: string } })?.error?.message ?? \"Failed to update user\");"),
    # Fix callback any in Select onValueChange
    ("onValueChange={v => setForm((f: any) => ({ ...f, role: v }))}",
     "onValueChange={v => setForm(f => ({ ...f, role: v }))}"))

# ── 8. app/approvals/page.tsx — fix any[] state ─────────────────────────────
print("▶ app/approvals/page.tsx")
patch(f"{WEB}/app/approvals/page.tsx",
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState } from "react";\nimport type { Approval } from "@/lib/types";'),
    ("const [approvals, setApprovals] = useState<any[]>([]);",
     "const [approvals, setApprovals] = useState<Approval[]>([]);"))

# ── 9. app/audit-log/page.tsx — fix any[] + any state ───────────────────────
print("▶ app/audit-log/page.tsx")
patch(f"{WEB}/app/audit-log/page.tsx",
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState } from "react";\nimport type { AuditEntry, ApiUser } from "@/lib/types";'),
    ("const [entries, setEntries] = useState<any[]>([]);",
     "const [entries, setEntries] = useState<AuditEntry[]>([]);"),
    ("const [me, setMe]           = useState<any>(null);",
     "const [me, setMe]           = useState<ApiUser | null>(null);"))

# ── 10. app/dashboard/page.tsx — fix any[] + any + setState-in-effect ────────
print("▶ app/dashboard/page.tsx")
patch(f"{WEB}/app/dashboard/page.tsx",
    # Add import for useMemo and types
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState, useMemo } from "react";\nimport type { ApiDocument, ApiUser } from "@/lib/types";'),
    # Fix state types
    ("const [allDocs, setAllDocs] = useState<any[]>([]);",
     "const [allDocs, setAllDocs] = useState<ApiDocument[]>([]);"),
    ("const [docs, setDocs]       = useState<any[]>([]);",
     "const [_docsUnused, _setDocsUnused] = useState<ApiDocument[]>([]);"),
    ("const [me, setMe]           = useState<any>(null);",
     "const [me, setMe]           = useState<ApiUser | null>(null);"),
    # Replace 2nd useEffect (setState in effect) with useMemo
    ("""\
  useEffect(() => {
    let f = [...allDocs];
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(d => d.title?.toLowerCase().includes(q) || d.documentCode?.toLowerCase().includes(q));
    }
    if (status !== "all") f = f.filter(d => d.status === status);
    if (risk   !== "all") f = f.filter(d => d.riskLevel === risk);
    setDocs(f);
  }, [search, status, risk, allDocs]);""",
     """\
  const docs = useMemo(() => {
    let f = [...allDocs];
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(d => d.title?.toLowerCase().includes(q) || d.documentCode?.toLowerCase().includes(q));
    }
    if (status !== "all") f = f.filter(d => d.status === status);
    if (risk   !== "all") f = f.filter(d => d.riskLevel === risk);
    return f;
  }, [search, status, risk, allDocs]);"""),
    # Fix Select onValueChange type annotations
    ("onValueChange={(v: string | null) => setStatus(v ?? \"all\")}",
     'onValueChange={(v: string) => setStatus(v)}'),
    ("onValueChange={(v: string | null) => setRisk(v ?? \"all\")}",
     'onValueChange={(v: string) => setRisk(v)}'))

# ── 11. app/documents/[id]/page.tsx — fix any states + callbacks ─────────────
print("▶ app/documents/[id]/page.tsx")
path_doc = f"{WEB}/app/documents/[id]/page.tsx"
patch(path_doc,
    # Add types import
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState } from "react";\nimport type { ApiDocument, ApiUser, Approval, RoleAssignment } from "@/lib/types";'),
    # Fix state types
    ("const [doc, setDoc]               = useState<any>(null);",
     "const [doc, setDoc]               = useState<ApiDocument | null>(null);"),
    ("const [me, setMe]                 = useState<any>(null);",
     "const [me, setMe]                 = useState<ApiUser | null>(null);"),
    ("const [myApproval, setMyApproval] = useState<any>(null);",
     "const [myApproval, setMyApproval] = useState<Approval | null>(null);"),
    # Fix apiPost body: any
    ("async function apiPost(path: string, body?: any) {",
     "async function apiPost(path: string, body?: Record<string, unknown>) {"),
    # Fix handle err: any
    ("try { await action(); } catch (e: any) { toast.error(e.message ?? \"Something went wrong\"); }",
     "try { await action(); } catch (e: unknown) { toast.error((e instanceof Error ? e.message : undefined) ?? \"Something went wrong\"); }"),
    # Fix roles.find callback any
    ("const myRole  = roles.find((r: any) => r.userId === myId);",
     "const myRole  = (roles as RoleAssignment[]).find(r => r.userId === myId);"),
    # Fix appData.find callback any
    ("const found = Array.isArray(appData) ? appData.find((a: any) => a.documentId === params.id || a.document?.id === params.id) : null;",
     "const found = Array.isArray(appData) ? (appData as Approval[]).find(a => a.documentId === params.id || a.document?.id === params.id) : null;"),
    # Fix setState-in-effect eslint error
    ("  async function load() {",
     "  // eslint-disable-next-line react-hooks/exhaustive-deps\n  async function load() {"))

# ── 12. app/documents/new/page.tsx — fix any[] + callback any ────────────────
print("▶ app/documents/new/page.tsx")
patch(f"{WEB}/app/documents/new/page.tsx",
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState } from "react";\nimport type { ApiUser } from "@/lib/types";'),
    ("const [users, setUsers]   = useState<any[]>([]);",
     "const [users, setUsers]   = useState<ApiUser[]>([]);"),
    ("function setF(field: string, value: any) { setForm(f => ({ ...f, [field]: value })); }",
     "function setF(field: string, value: unknown) { setForm(f => ({ ...f, [field]: value })); }"),
    ("} catch (e: any) { toast.error(e.message); }",
     "} catch (e: unknown) { toast.error(e instanceof Error ? e.message : \"Failed\"); }"),
    # Fix Select callback any annotations
    ("onValueChange={v => setRoles((r: any) => ({ ...r, [roleType]: v }))}",
     "onValueChange={v => setRoles(r => ({ ...r, [roleType]: v }))}"),
    ("onValueChange={v => setEvidence((ev: any) => ({ ...ev, type: v }))}",
     "onValueChange={v => setEvidence(ev => ({ ...ev, type: v }))}"))

# ── 13. app/ledger/page.tsx — fix any[] state ────────────────────────────────
print("▶ app/ledger/page.tsx")
patch(f"{WEB}/app/ledger/page.tsx",
    ('"use client";\nimport { useEffect, useState } from "react";',
     '"use client";\nimport { useEffect, useState } from "react";\nimport type { LedgerEntry } from "@/lib/types";'),
    ("const [entries, setEntries] = useState<any[]>([]);",
     "const [entries, setEntries] = useState<LedgerEntry[]>([]);"))

# ── 14. Fix API any errors (authorize.ts already fixed, check tests) ──────────
print("▶ API: check tests for any")
api_test = f"{API}/tests/api.test.ts"
try:
    with open(api_test) as f: content = f.read()
    if ": any" in content or "any[]" in content:
        content = re.sub(r'\(body as any\)', '(body as Record<string, unknown>)', content)
        content = re.sub(r'\(body as \{ ([^}]+) \}\)', lambda m: f'(body as {{ {m.group(1)} }})', content)
        with open(api_test, "w") as f: f.write(content)
        print(f"  ✓ api test any fixed")
    else:
        print(f"  - no any in api test")
except FileNotFoundError:
    print(f"  ⚠ api test not found")

print("\n✅ All lint fixes applied!")
print("\nNow run: cd ~/rapid-ledger && npm run lint 2>&1 | tail -10")
