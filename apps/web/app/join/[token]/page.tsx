
"use client"
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){ const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/); return m?decodeURIComponent(m[1]):null; }

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const inviteToken = params.token as string;

  const [step, setStep]         = useState<"loading"|"register"|"login"|"totp"|"joining"|"done">("loading");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking]   = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");

  useEffect(() => {
    const t = getToken();
    if (t) { setStep("joining"); joinOrg(t); }
    else { setStep("register"); }
  }, []);

  async function joinOrg(t: string) {
    const res = await fetch(`${API}/orgs/join/${inviteToken}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("You have joined the organisation!");
      setStep("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      toast.error(data?.error?.message ?? "Failed to join org");
      setStep("login");
    }
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) { toast.error("All fields required"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setWorking(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Account created! Now log in to accept the invite.");
        setStep("login");
      } else { toast.error(data?.error?.message ?? "Registration failed"); }
    } catch { toast.error("Network error"); }
    finally { setWorking(false); }
  }

  function setTokenCookie(t: string) {
    const age = 60 * 60 * 24 * 7;
    const secure = location.protocol === "https:" ? ";Secure" : "";
    document.cookie = `rapid_token=${encodeURIComponent(t)};path=/;max-age=${age};SameSite=Lax${secure}`;
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { toast.error("Email and password required"); return; }
    setWorking(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.requiresMfa) {
        // Existing account with TOTP already enabled — verify the code here
        // rather than bouncing the person away from the invite link.
        setPendingUserId(data.userId ?? "");
        setStep("totp");
      } else if (res.ok && data.token) {
        if (!data.user?.totpEnabled) {
          // New/never-set-up account: MFA setup is mandatory before the invite
          // can be accepted (per the required Register → MFA → Sign in → Join
          // sequence). Land on TOTP setup, then bounce back here to finish joining.
          setTokenCookie(data.token);
          router.push(`/settings/totp?required=1&next=${encodeURIComponent(`/join/${inviteToken}`)}`);
          return;
        }
        setTokenCookie(data.token);
        setStep("joining");
        await joinOrg(data.token);
      } else {
        toast.error(data?.error?.message ?? "Login failed");
      }
    } catch { toast.error("Network error"); }
    finally { setWorking(false); }
  }

  async function handleTotpValidate() {
    if (totpCode.length !== 6) return;
    setWorking(true);
    try {
      const res = await fetch(`${API}/auth/totp/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUserId, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error("Invalid code. Try again.");
      setTokenCookie(data.token);
      setStep("joining");
      await joinOrg(data.token);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Invalid code.");
      setTotpCode("");
    } finally { setWorking(false); }
  }

  if (step === "loading" || step === "joining") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-sm text-slate-500">Accepting invite…</p>
      </div>
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎉</div>
        <p className="text-xl font-bold text-slate-900">You have joined!</p>
        <p className="text-sm text-slate-500">Redirecting to dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-primary-foreground font-bold text-xl">RL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">You have been invited</h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "register" ? "Create an account to join your organisation"
              : step === "totp" ? "Enter your authenticator code to continue"
              : "Sign in to accept the invite"}
          </p>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {step === "register" ? "Create account" : step === "totp" ? "Two-factor verification" : "Sign in"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "totp" ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Authentication code</label>
                  <input
                    inputMode="numeric" maxLength={6}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="000000" value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && handleTotpValidate()}
                  />
                </div>
                <Button className="w-full h-11 font-semibold" disabled={working || totpCode.length !== 6} onClick={handleTotpValidate}>
                  {working ? "Verifying…" : "Verify & Join →"}
                </Button>
              </>
            ) : (
              <>
                {step === "register" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Full name</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email</label>
                  <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Password</label>
                  <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (step === "register" ? handleRegister() : handleLogin())} />
                </div>
                <Button className="w-full h-11 font-semibold" disabled={working}
                  onClick={step === "register" ? handleRegister : handleLogin}>
                  {working ? "Please wait…" : step === "register" ? "Create Account & Join →" : "Sign In & Join →"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        {step !== "totp" && (
          <p className="text-center text-sm text-slate-500">
            {step === "register" ? "Already have an account? " : "Need an account? "}
            <button className="text-primary font-semibold hover:underline"
              onClick={() => setStep(step === "register" ? "login" : "register")}>
              {step === "register" ? "Sign in instead" : "Register instead"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
