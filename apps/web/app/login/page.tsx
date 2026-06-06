"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ROLE_ROUTES: Record<string, string> = {
  admin: "/dashboard", creator: "/dashboard", recommender: "/dashboard",
  approver: "/approvals", decision_owner: "/dashboard", decider: "/dashboard",
  performer: "/dashboard", viewer: "/dashboard",
};

type UserData = { id: string; name: string; email: string; role: string; totpEnabled?: boolean };

const LEFT = (
  <div className="hidden lg:flex flex-col justify-between w-[46%] px-14 py-12 relative overflow-hidden"
    style={{ background: "#0a0f1e" }}>
    <div className="absolute inset-0 opacity-[0.04]"
      style={{backgroundImage:"radial-gradient(circle at 80% 20%,#3b82f6 0%,transparent 50%),radial-gradient(circle at 20% 80%,#6366f1 0%,transparent 50%)"}} />
    <div className="relative flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:"#1d4ed8"}}>
        <span className="text-white font-bold text-sm tracking-tight">RL</span>
      </div>
      <div>
        <p className="text-white font-bold text-sm tracking-wide">RAPID Ledger</p>
        <p className="text-slate-500 text-[11px] tracking-wider uppercase mt-0.5">by Complyance</p>
      </div>
    </div>
    <div className="relative space-y-10">
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 border border-slate-700 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">Compliant · Auditable · Secure</span>
        </div>
        <h2 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
          Decision governance<br />without compromise.
        </h2>
        <p className="text-slate-400 text-[15px] leading-relaxed max-w-[340px]">
          Turn every important decision into a structured RAPID document with clear ownership, approval workflows, and immutable audit trails.
        </p>
      </div>
      <div className="space-y-3">
        {["Multi-stage approval workflows","Immutable audit log & ledger","Role-based access control","Full governance traceability","Regulatory reporting & exports"].map(f => (
          <div key={f} className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:"#3b82f6"}} />
            <span className="text-slate-300 text-[13px]">{f}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="relative flex items-center justify-between">
      <p className="text-slate-600 text-xs">© 2026 Complyance Inc. All rights reserved.</p>
      <div className="flex items-center gap-4">
        {["Privacy","Security","Terms"].map(t => <span key={t} className="text-slate-600 text-xs">{t}</span>)}
      </div>
    </div>
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [totpStep, setTotpStep]   = useState(false);
  const [totpCode, setTotpCode]   = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [pendingUser, setPendingUser]   = useState<UserData | null>(null);

  function applySession(token: string, user: UserData) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    const age = 60 * 60 * 24 * 7;
    document.cookie = `rapid_token=${token}; path=/; max-age=${age}; SameSite=Lax${secure}`;
    document.cookie = `rapid_role=${user.role}; path=/; max-age=${age}; SameSite=Lax${secure}`;
    toast.success("Welcome back, " + user.name + "!");
    if (!user.orgId) { router.push("/onboarding"); } else { router.push(ROLE_ROUTES[user.role] ?? "/dashboard"); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      const user: UserData = data.user;
      if (user.totpEnabled) {
        setPendingToken(data.token);
        setPendingUser(user);
        setTotpStep(true);
      } else {
        applySession(data.token, user);
      }
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message ?? "";
      toast.error(msg.includes("verify your email")
        ? "Please verify your email before signing in. Check your inbox."
        : msg || "Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUser) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/totp/validate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUser.id, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error("Invalid code. Try again.");
      applySession(pendingToken, pendingUser);
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Invalid code.");
      setTotpCode("");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {LEFT}
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc] px-8 py-12">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">RL</span>
            </div>
            <span className="text-slate-900 font-bold">RAPID Ledger</span>
          </div>

          {totpStep ? (
            <>
              <div className="mb-8">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-[1.75rem] font-bold text-slate-900 tracking-tight">Two-factor auth</h1>
                <p className="text-slate-500 text-sm mt-2">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <form onSubmit={handleTotp} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="totp" className="text-slate-700 text-[13px] font-semibold tracking-wide">Authentication Code</Label>
                  <Input id="totp" type="text" inputMode="numeric" maxLength={6} required
                    placeholder="000000" value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                    className="h-11 bg-white border-slate-200 text-center tracking-[0.4em] font-mono text-lg rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
                  />
                </div>
                <Button type="submit" disabled={loading || totpCode.length !== 6}
                  className="w-full h-11 text-sm font-semibold rounded-lg border-none"
                  style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",boxShadow:"0 4px 12px rgba(29,78,216,0.3)"}}>
                  {loading ? <span className="flex items-center gap-2.5"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Verifying...</span> : "Verify code"}
                </Button>
                <button type="button" onClick={() => { setTotpStep(false); setTotpCode(""); }}
                  className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  ← Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[1.75rem] font-bold text-slate-900 tracking-tight">Sign in</h1>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Access your RAPID Ledger workspace with your organisational credentials.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 text-[13px] font-semibold tracking-wide">Work Email</Label>
                  <Input id="email" type="email" required autoComplete="email"
                    placeholder="you@company.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 text-[13px] font-semibold tracking-wide">Password</Label>
                    <button type="button" className="text-[13px] text-blue-600 hover:text-blue-700 font-medium transition-colors">Forgot password?</button>
                  </div>
                  <Input id="password" type="password" required autoComplete="current-password"
                    placeholder="Enter your password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all"
                  />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-11 text-sm font-semibold rounded-lg border-none mt-1"
                  style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",boxShadow:"0 4px 12px rgba(29,78,216,0.3)"}}>
                  {loading ? <span className="flex items-center gap-2.5"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in...</span> : "Continue"}
                </Button>
              </form>
              <div className="mt-8 pt-7 border-t border-slate-200 space-y-4">
                <p className="text-slate-500 text-sm text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">Sign up</Link>
                </p>
                <p className="text-slate-400 text-xs text-center leading-relaxed">
                  Access is provisioned by your system administrator.<br />Contact IT support if you are unable to sign in.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
