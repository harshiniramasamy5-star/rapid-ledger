"use client";
import { useEffect, useState, useCallback } from "react";
import { AnalyticsCharts } from "@/components/analytics-charts";
import type { ApiDocument, ApiUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUS_VARIANTS: Record<string, "default"|"secondary"|"destructive"|"outline"> = {
  draft: "outline", submitted: "secondary", awaiting_agreement: "secondary",
  approved: "default", finalized: "default", execution_complete: "default", rejected: "destructive",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600", medium: "text-yellow-600", high: "text-orange-600", critical: "text-red-600",
};

const ROLE_BADGE: Record<string, string> = {
  admin:     "bg-red-100 text-red-700 border border-red-200",
  creator:   "bg-blue-100 text-blue-700 border border-blue-200",
  approver:  "bg-amber-100 text-amber-700 border border-amber-200",
  decider:   "bg-purple-100 text-purple-700 border border-purple-200",
  performer: "bg-green-100 text-green-700 border border-green-200",
  viewer:   "bg-gray-100 text-gray-700 border border-gray-200",
};

interface PaginatedResponse {
  data: ApiDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const LIMIT = 10;

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe]               = useState<ApiUser | null>(null);
  const [docs, setDocs]           = useState<ApiDocument[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("all");
  const [risk, setRisk]           = useState("all");
  const [statsData, setStatsData] = useState({ total: 0, drafts: 0, pending: 0, finalized: 0 });

  const fetchDocs = useCallback(async (token: string, pg: number, q: string, st: string, rk: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
    if (q.trim()) params.set("search", q.trim());
    if (st !== "all") params.set("status", st);
    if (rk !== "all") params.set("riskLevel", rk);
    try {
      const res = await fetch(`${API}/documents?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json: PaginatedResponse = await res.json();
      setDocs(json.data ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (token: string) => {
    const [all, drafts, pending, finalized] = await Promise.all([
      fetch(`${API}/documents?limit=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/documents?limit=1&status=draft`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/documents?limit=1&status=awaiting_agreement`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/documents?limit=1&status=finalized`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setStatsData({ total: all.total ?? 0, drafts: drafts.total ?? 0, pending: pending.total ?? 0, finalized: finalized.total ?? 0 });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("rapid_token");
    if (!token) { router.replace("/login"); return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMe);
    fetchStats(token);
    fetchDocs(token, 1, "", "all", "all");
  }, [router, fetchDocs, fetchStats]);

  useEffect(() => {
    const token = localStorage.getItem("rapid_token");
    if (!token) return;
    const t = setTimeout(() => fetchDocs(token, page, search, status, risk), 300);
    return () => clearTimeout(t);
  }, [search, status, risk, page, fetchDocs]);

  function logout() {
    localStorage.removeItem("rapid_token");
    localStorage.removeItem("rapid_user");
    router.replace("/login");
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string | null) => { setter(v ?? "all"); setPage(1); };
  }

  const stats = [
    { label: "Total Documents",  value: statsData.total,    color: "text-primary",     bg: "bg-primary/5"  },
    { label: "Drafts",           value: statsData.drafts,   color: "text-slate-600",   bg: "bg-slate-100"  },
    { label: "Pending Approval", value: statsData.pending,  color: "text-amber-600",   bg: "bg-amber-50"   },
    { label: "Finalized",        value: statsData.finalized,color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const navItems = [
    { label: "Approvals", path: "/approvals",  roles: ["admin","approver"] },
    { label: "Ledger",    path: "/ledger",      roles: ["admin","viewer","decider","creator","approver","performer"] },
    { label: "Audit Log", path: "/audit-log",   roles: ["admin","viewer"] },
    { label: "Admin",     path: "/admin",       roles: ["admin"] },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">RAPID Ledger</p>
              <p className="text-xs text-slate-400 mt-0.5">Decision Governance Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {me && navItems.filter(n => n.roles.includes(me.role)).map(n => (
              <Button key={n.path} variant="ghost" size="sm"
                className="text-slate-600 hover:text-slate-900 text-sm"
                onClick={() => router.push(n.path)}>
                {n.label}
              </Button>
            ))}
            <Separator orientation="vertical" className="h-5 mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div role="button" tabIndex={0}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors select-none"
                  onKeyDown={e => e.key === "Enter" && (e.currentTarget as HTMLElement).click()}>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-bold">{me?.name?.[0] ?? "U"}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-none">{me?.name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${ROLE_BADGE[me?.role ?? ""] ?? ""}`}>
                      {me?.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem className="text-sm font-medium text-slate-700 focus:bg-slate-50">
                    {me?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50 text-sm font-medium">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {me?.name?.split(" ")[0]} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here is what is happening in your decision governance workspace.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="border-slate-200 shadow-sm overflow-hidden">
              <CardContent className={`pt-5 pb-5 ${s.bg}`}>
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-slate-500 mt-1 font-medium">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AnalyticsCharts />

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-900">RAPID Documents</CardTitle>
              {me?.role === "creator" && (
                <Button size="sm" onClick={() => router.push("/documents/new")}>+ New Document</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap pt-2">
              <Input placeholder="Search by title or code..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 min-w-[200px] border-slate-200" />
              <Select value={status} onValueChange={handleFilterChange(setStatus)}>
                <SelectTrigger className="w-[190px] border-slate-200"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="awaiting_agreement">Awaiting Agreement</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="execution_complete">Execution Complete</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={risk} onValueChange={handleFilterChange(setRisk)}>
                <SelectTrigger className="w-[160px] border-slate-200"><SelectValue placeholder="All risk levels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Loading documents...</p>
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📂</p>
                <p className="text-slate-600 font-medium">No documents found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {search || status !== "all" || risk !== "all" ? "Try adjusting your filters" : "Create your first document to get started"}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Code</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compliance</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map(doc => (
                      <TableRow key={doc.id} className="border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => router.push(`/documents/${doc.id}`)}>
                        <TableCell className="font-mono text-xs text-slate-400">{doc.documentCode}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[doc.status] ?? "outline"} className="capitalize text-xs">
                            {doc.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-semibold capitalize text-sm ${RISK_COLORS[doc.riskLevel] ?? "text-slate-600"}`}>
                          {doc.riskLevel}
                        </TableCell>
                        <TableCell>
                          {doc.complianceImpact
                            ? <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Yes</span>
                            : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{doc.deadline ? formatDate(doc.deadline) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total} documents
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      className="text-xs h-7 px-3">
                      ← Previous
                    </Button>
                    <span className="text-xs text-slate-500 font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="text-xs h-7 px-3">
                      Next →
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
