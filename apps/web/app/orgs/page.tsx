"use client"
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){ const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/); return m?decodeURIComponent(m[1]):null; }

export default function OrgsPage() {
  const router = useRouter();
  const [org, setOrg]           = useState<{id:string;name:string;domain?:string;logoUrl?:string;description?:string;memberCount?:number}|null>(null);
  const [myAccessType, setMyAccessType] = useState<"admin"|"member"|null>(null);
  const [members, setMembers]   = useState<{id:string;name:string;email:string;role:string;accessType:string}[]>([]);
  const [me, setMe]             = useState<{id:string;role:string;orgId?:string}|null>(null);
  const [loading, setLoading]   = useState(true);
  const [orgName, setOrgName]   = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<Array<{id:string;email:string;role:string;expiresAt:string}>>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [logoUrl, setLogoUrl]   = useState("");
  const [description, setDescription] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [activity, setActivity] = useState<Array<{id:string;action:string;entityType:string;createdAt:string;user?:{name:string;email:string}}>>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const token = () => getToken() ?? "";

  const load = useCallback(async () => {
    const t = token();
    if (!t) { router.replace("/login"); return; }
    const [meRes, mineRes] = await Promise.all([
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`${API}/orgs/mine`, { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    const meData   = await meRes.json();
    const mineData = await mineRes.json();
    setMe(meData);
    const activeWs = (mineData?.workspaces ?? []).find((w: {isActive: boolean}) => w.isActive) ?? null;
    setOrg(activeWs ? { id: activeWs.id, name: activeWs.name, domain: activeWs.domain, logoUrl: activeWs.logoUrl, description: activeWs.description, memberCount: activeWs.memberCount } : null);
    setMyAccessType(activeWs?.accessType ?? null);
    if (activeWs) {
      setLogoUrl(activeWs.logoUrl ?? "");
      setDescription(activeWs.description ?? "");
      const mRes = await fetch(`${API}/orgs/${activeWs.id}/members`, { headers: { Authorization: `Bearer ${t}` } });
      const mData = await mRes.json();
      setMembers(mData?.members ?? []);
      if (activeWs.accessType === "admin") void loadInvites(activeWs.id);
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
    if (res.ok) { toast.success("Workspace created!"); await load(); }
    else toast.error(data?.error?.message ?? data?.error ?? "Failed to create workspace");
    setCreating(false);
  }

  async function loadInvites(orgId: string) {
    setLoadingInvites(true);
    try {
      const res = await fetch(`${API}/orgs/${orgId}/invites`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await res.json();
      if (res.ok) setInvites(data.invites ?? []);
    } finally { setLoadingInvites(false); }
  }

  async function revokeInvite(inviteId: string) {
    if (!org) return;
    const res = await fetch(`${API}/orgs/${org.id}/invites/${inviteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });
    if (res.ok) { toast.success("Invite revoked"); setInvites(i => i.filter(x => x.id !== inviteId)); }
    else toast.error("Failed to revoke");
  }

  async function resendInvite(inviteId: string) {
    if (!org) return;
    const res = await fetch(`${API}/orgs/${org.id}/invites/${inviteId}/resend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });
    if (res.ok) toast.success("Invite resent!");
    else toast.error("Failed to resend");
  }

  async function saveBranding() {
    if (!org) return;
    setSavingBranding(true);
    try {
      const res = await fetch(`${API}/orgs/${org.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: logoUrl.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Branding updated"); await load(); }
      else toast.error(data?.error ?? "Failed to update branding");
    } finally { setSavingBranding(false); }
  }

  async function loadActivity() {
    setLoadingActivity(true);
    try {
      const res = await fetch(`${API}/audit-logs`, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
      const data = await res.json();
      if (res.ok) setActivity(Array.isArray(data) ? data : []);
    } finally { setLoadingActivity(false); }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !org) return;
    setInviting(true);
    const res = await fetch(`${API}/orgs/${org.id}/invite`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: "viewer" }),
    });
    const data = await res.json();
    if (res.ok) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(""); if (org) loadInvites(org.id); }
    else toast.error(data?.error?.message ?? data?.error ?? "Failed to send invite");
    setInviting(false);
  }

  const isAdmin = myAccessType === "admin";

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">Workspace</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>← Dashboard</Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {!org ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader><CardTitle>Create your workspace</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Workspace name *" value={orgName} onChange={e => setOrgName(e.target.value)} />
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Domain (optional, e.g. acme.com)" value={orgDomain} onChange={e => setOrgDomain(e.target.value)} />
              <Button className="w-full" disabled={creating || !orgName.trim()} onClick={createOrg}>
                {creating ? "Creating…" : "Create Workspace"}
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
                  <span>👥 {org.memberCount ?? members.length} member{(org.memberCount ?? members.length) !== 1 ? "s" : ""}</span>
                  <span className="capitalize">🔑 You: {myAccessType}</span>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">Invite member</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Email address *" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  <Button className="w-full" disabled={inviting || !inviteEmail.trim()} onClick={sendInvite}>
                    {inviting ? "Sending…" : "Send Invite Email"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">Pending invites</CardTitle></CardHeader>
                <CardContent>
                  {loadingInvites ? (
                    <p className="text-sm text-slate-400">Loading…</p>
                  ) : invites.length === 0 ? (
                    <p className="text-sm text-slate-400">No pending invites.</p>
                  ) : (
                    <div className="space-y-2">
                      {invites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{inv.email}</p>
                            <p className="text-xs text-slate-400 capitalize">{inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button className="text-xs text-primary hover:underline font-medium" onClick={() => resendInvite(inv.id)}>Resend</button>
                            <button className="text-xs text-red-500 hover:text-red-700 font-medium" onClick={async () => { await revokeInvite(inv.id); }}>Revoke</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Logo URL</label>
                    <div className="flex items-center gap-3">
                      {logoUrl.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl.trim()} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
                      ) : (
                        <div className="w-9 h-9 rounded-lg border border-dashed border-slate-200 shrink-0" />
                      )}
                      <input className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="https://example.com/logo.png"
                        value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
                    <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                      placeholder="What does your team do?" value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <Button className="w-full" disabled={savingBranding} onClick={saveBranding}>
                    {savingBranding ? "Saving…" : "Save Branding"}
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
                        <div className="flex items-center gap-2">
                          {isAdmin && m.id !== me?.id && (
                                  <>
                              <button
                                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
                                onClick={async () => {
                                  if (!confirm(`Remove ${m.name} from workspace?`)) return;
                                  const res = await fetch(`${API}/orgs/${org!.id}/members/${m.id}`, {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token()}` },
                                  });
                                  if (res.ok) { toast.success("Member removed"); await load(); }
                                  else toast.error("Failed to remove member");
                                }}>
                                Remove
                              </button>
                            </>
                          )}
                          <Badge variant="outline" className="capitalize text-xs">{m.accessType}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Activity log</CardTitle>
                  <Button
                    variant="outline" size="sm" className="text-xs"
                    onClick={() => { const next = !showActivity; setShowActivity(next); if (next && activity.length === 0) void loadActivity(); }}
                  >
                    {showActivity ? "Hide" : "View activity"}
                  </Button>
                </CardHeader>
                {showActivity && (
                  <CardContent>
                    {loadingActivity ? (
                      <p className="text-sm text-slate-400">Loading…</p>
                    ) : activity.length === 0 ? (
                      <p className="text-sm text-slate-400">No activity recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {activity.map(a => (
                          <div key={a.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                            <div>
                              <span className="font-medium text-slate-800">{a.user?.name ?? "System"}</span>
                              <span className="text-slate-400"> · {a.action.replace(/_/g, " ")} · {a.entityType}</span>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{new Date(a.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
