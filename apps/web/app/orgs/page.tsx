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

export default function OrgsPage() {
  const router = useRouter();
  const [org, setOrg]           = useState<{id:string;name:string;domain?:string;_count?:{users:number}}|null>(null);
  const [members, setMembers]   = useState<{id:string;name:string;email:string;role:string}[]>([]);
  const [me, setMe]             = useState<{id:string;role:string;orgId?:string}|null>(null);
  const [loading, setLoading]   = useState(true);
  const [orgName, setOrgName]   = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("viewer");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  const token = () => getToken() ?? "";

  const load = useCallback(async () => {
    const t = token();
    if (!t) { router.replace("/login"); return; }
    const [meRes, orgRes] = await Promise.all([
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`${API}/orgs/my`, { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    const meData  = await meRes.json();
    const orgData = await orgRes.json();
    setMe(meData);
    setOrg(orgData?.org ?? null);
    if (orgData?.org) {
      const mRes = await fetch(`${API}/orgs/${orgData.org.id}/members`, { headers: { Authorization: `Bearer ${t}` } });
      const mData = await mRes.json();
      setMembers(mData?.members ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function createOrg() {
    if (!orgName.trim()) return;
    setCreating(true);
    const res = await fetch(`${API}/orgs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName.trim(), domain: orgDomain.trim() || undefined }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Organisation created!"); await load(); }
    else toast.error(data?.error?.message ?? data?.error ?? "Failed to create org");
    setCreating(false);
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !org) return;
    setInviting(true);
    const res = await fetch(`${API}/orgs/${org.id}/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();
    if (res.ok) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(""); }
    else toast.error(data?.error?.message ?? data?.error ?? "Failed to send invite");
    setInviting(false);
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">Organisation</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>← Dashboard</Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {!org ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle>Create your organisation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Organisation name *" value={orgName} onChange={e => setOrgName(e.target.value)} />
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Domain (optional, e.g. acme.com)" value={orgDomain} onChange={e => setOrgDomain(e.target.value)} />
              <Button className="w-full" disabled={creating || !orgName.trim()} onClick={createOrg}>
                {creating ? "Creating…" : "Create Organisation"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{org.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-slate-600">
                  {org.domain && <span>🌐 {org.domain}</span>}
                  <span>👥 {org._count?.users ?? members.length} member{(org._count?.users ?? members.length) !== 1 ? "s" : ""}</span>
                </div>
              </CardContent>
            </Card>

            {me?.role === "admin" && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">Invite member</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Email address *" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <Button className="w-full" disabled={inviting || !inviteEmail.trim()} onClick={sendInvite}>
                    {inviting ? "Sending…" : "Send Invite Email"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Members</CardTitle></CardHeader>
              <CardContent>
                {members.length === 0 ? <p className="text-sm text-slate-400">No members yet.</p> : (
                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.email}</p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
