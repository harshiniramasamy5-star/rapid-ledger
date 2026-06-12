"use client"
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){ const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/); return m?decodeURIComponent(m[1]):null; }

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]         = useState<"check"|"create"|"done">("check");
  const [orgName, setOrgName]   = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [me, setMe]             = useState<{id:string;name:string;role:string;orgId?:string}|null>(null);

  const check = useCallback(async () => {
    const t = getToken();
    if (!t) { router.replace("/login"); return; }
    const res  = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (data?.orgId) { router.replace("/dashboard"); return; }
    setMe(data);
    // promote to admin so they can create org
    if (data?.role !== "admin") {
      await fetch(`${API}/users/${data.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
    }
    setStep("create");
  }, [router]);

  useEffect(() => { void check(); }, [check]);

  async function createOrg() {
    if (!orgName.trim()) return;
    setCreating(true);
    const t = getToken();
    const res = await fetch(`${API}/orgs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName.trim(), domain: orgDomain.trim() || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      // join the org as admin
      const orgId = data?.org?.id;
      if (orgId && me) {
        await fetch(`${API}/users/${me.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        });
      }
      toast.success("Organisation created! Welcome to RAPID Ledger.");
      setStep("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      toast.error(data?.error?.message ?? data?.error ?? "Failed to create org");
    }
    setCreating(false);
  }

  if (step === "check") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎉</div>
        <p className="text-xl font-bold text-slate-900">You&apos;re all set!</p>
        <p className="text-sm text-slate-500">Redirecting to your dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">RL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to RAPID Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">Set up your organisation to get started</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create your organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Organisation name *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. Acme Corp"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createOrg()}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Company domain <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. acme.com"
                value={orgDomain}
                onChange={e => setOrgDomain(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Team members with this domain will be auto-assigned to your org on signup.</p>
            </div>
            <Button className="w-full h-11 font-semibold" disabled={creating || !orgName.trim()} onClick={createOrg}>
              {creating ? "Creating…" : "Create Organisation & Continue →"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          You&apos;ll be set as the organisation admin. Invite your team from the dashboard.
        </p>
      </div>
    </div>
  );
}
