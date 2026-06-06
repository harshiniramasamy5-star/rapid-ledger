"use client"
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){ const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/); return m?decodeURIComponent(m[1]):null; }

const ROLES = ["viewer","creator","recommender","approver","performer","admin"];
const ROLE_COLORS: Record<string,string> = {
  admin:"bg-red-50 text-red-700 border-red-200",
  creator:"bg-blue-50 text-blue-700 border-blue-200",
  approver:"bg-emerald-50 text-emerald-700 border-emerald-200",
  recommender:"bg-purple-50 text-purple-700 border-purple-200",
  performer:"bg-amber-50 text-amber-700 border-amber-200",
  viewer:"bg-slate-50 text-slate-600 border-slate-200",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers]   = useState<{id:string;name:string;email:string;role:string;isActive:boolean;department?:string}[]>([]);
  const [me, setMe]         = useState<{id:string;role:string}|null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string|null>(null);
  const [search, setSearch] = useState("");

  const token = () => getToken() ?? "";

  const load = useCallback(async () => {
    const t = token();
    if (!t) { router.replace("/login"); return; }
    const [meRes, usersRes] = await Promise.all([
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`${API}/users`,   { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    const meData    = await meRes.json();
    const usersData = await usersRes.json();
    if (meData?.role !== "admin") { router.replace("/dashboard"); return; }
    setMe(meData);
    setUsers(Array.isArray(usersData) ? usersData : []);
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function updateRole(userId: string, role: string) {
    setUpdating(userId);
    const res = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Role updated"); await load(); }
    else toast.error(data?.error?.message ?? "Failed to update role");
    setUpdating(null);
  }

  async function toggleActive(userId: string, isActive: boolean) {
    if (userId === me?.id) { toast.error("Cannot deactivate your own account"); return; }
    setUpdating(userId);
    const res = await fetch(`${API}/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = await res.json();
    if (res.ok) { toast.success(isActive ? "User deactivated" : "User activated"); await load(); }
    else toast.error(data?.error?.message ?? "Failed");
    setUpdating(null);
  }

  async function unlockUser(userId: string) {
    setUpdating(userId);
    const res = await fetch(`${API}/users/${userId}/unlock`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (res.ok) { toast.success("Account unlocked"); await load(); }
    else toast.error(data?.error?.message ?? "Failed");
    setUpdating(null);
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">User Management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/orgs")}>Organisation</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>← Dashboard</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Users ({users.length})</h1>
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                      {!u.isActive && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">INACTIVE</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    {u.department && <p className="text-xs text-slate-400">{u.department}</p>}
                  </div>

                  <select
                    className={`border rounded-lg px-2 py-1.5 text-xs font-semibold ${ROLE_COLORS[u.role] ?? "bg-slate-50 text-slate-600"}`}
                    value={u.role}
                    disabled={updating === u.id || u.id === me?.id}
                    onChange={e => updateRole(u.id, e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      className={u.isActive ? "text-red-600 border-red-200 hover:bg-red-50 text-xs" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs"}
                      disabled={updating === u.id || u.id === me?.id}
                      onClick={() => toggleActive(u.id, u.isActive)}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs"
                      disabled={updating === u.id}
                      onClick={() => unlockUser(u.id)}
                    >
                      Unlock
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No users found.</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
