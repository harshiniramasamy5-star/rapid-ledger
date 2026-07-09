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
  const [step, setStep]         = useState<"check"|"choose"|"create"|"waiting"|"done">("check");
  const [orgName, setOrgName]   = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgLogoUrl, setOrgLogoUrl] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [checkingAgain, setCheckingAgain] = useState(false);

  const check = useCallback(async () => {
    const t = getToken();
    if (!t) { router.replace("/login"); return; }
    const res  = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (data?.orgId) { router.replace("/dashboard"); return; }
    setStep("choose");
  }, [router]);

  useEffect(() => { void check(); }, [check]);

  async function createOrg() {
    if (!orgName.trim()) return;
    setCreating(true);
    const t = getToken();
    const res = await fetch(`${API}/orgs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: orgName.trim(),
        domain: orgDomain.trim() || undefined,
        logoUrl: orgLogoUrl.trim() || undefined,
        description: orgDescription.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      // Server now creates the WorkspaceMember + sets orgId/role atomically — no follow-up call needed
      toast.success("Workspace created! Welcome to RAPID Ledger.");
      setStep("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      toast.error(data?.error?.message ?? data?.error ?? "Failed to create workspace");
    }
    setCreating(false);
  }

  async function checkAgain() {
    setCheckingAgain(true);
    const t = getToken();
    const res  = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (data?.orgId) {
      toast.success("You've been added to a workspace!");
      router.replace("/dashboard");
    } else {
      toast.info("No invitation found yet. Check back soon.");
    }
    setCheckingAgain(false);
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

  if (step === "waiting") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
          <span className="text-primary-foreground font-bold text-xl">RL</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Waiting for an invitation</h1>
          <p className="text-sm text-slate-500 mt-2">
            Ask your workspace admin to invite <b>your email address</b>. Once invited,
            you&apos;ll receive an email with a link to join — or check back here.
          </p>
        </div>
        <Button variant="outline" className="w-full h-11" disabled={checkingAgain} onClick={checkAgain}>
          {checkingAgain ? "Checking…" : "Check again"}
        </Button>
        <button
          className="text-xs text-slate-400 hover:text-slate-600 underline"
          onClick={() => setStep("choose")}
        >
          ← Back
        </button>
      </div>
    </div>
  );

  if (step === "choose") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">RL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to RAPID Ledger</h1>
          <p className="text-sm text-slate-500 mt-1">You&apos;re not part of a workspace yet</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6 space-y-3">
            <Button className="w-full h-11 font-semibold" onClick={() => setStep("create")}>
              Create a new workspace
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => setStep("waiting")}>
              I have an invitation coming
            </Button>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400">
          Got an invite link in your email? Just open it — it&apos;ll bring you straight in.
        </p>
      </div>
    </div>
  );

  // step === "create"
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">RL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your workspace</h1>
          <p className="text-sm text-slate-500 mt-1">You&apos;ll be set as the workspace admin</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workspace details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Workspace name *</label>
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
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Logo URL <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="flex items-center gap-3">
                {orgLogoUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={orgLogoUrl.trim()}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg border border-dashed border-slate-200 shrink-0" />
                )}
                <input
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="https://example.com/logo.png"
                  value={orgLogoUrl}
                  onChange={e => setOrgLogoUrl(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="What does your team do?"
                rows={2}
                value={orgDescription}
                onChange={e => setOrgDescription(e.target.value)}
              />
            </div>
            <Button className="w-full h-11 font-semibold" disabled={creating || !orgName.trim()} onClick={createOrg}>
              {creating ? "Creating…" : "Create Workspace & Continue →"}
            </Button>
            <button
              className="text-xs text-slate-400 hover:text-slate-600 underline block mx-auto"
              onClick={() => setStep("choose")}
            >
              ← Back
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
