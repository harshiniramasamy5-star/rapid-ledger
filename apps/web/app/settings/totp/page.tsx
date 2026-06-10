"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const getToken = () => document.cookie.split("; ").find(r => r.startsWith("rapid_token="))?.split("=")[1] ?? "";

export default function TOTPSetupPage() {
  const [step, setStep]       = useState<"idle"|"setup"|"done">("idle");
  const [qrCode, setQrCode]   = useState("");
  const [secret, setSecret]   = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => { if (d?.totpEnabled || d?.user?.totpEnabled) setEnabled(true); })
      .catch(() => {});
  }, []);

  async function startSetup() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/totp/setup`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error?.message ?? "Setup failed");
      setQrCode(d.qrCode); setSecret(d.secret); setStep("setup");
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  async function enableTotp() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/totp/verify`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error?.message ?? "Invalid code");
      toast.success("Two-factor authentication enabled!"); setEnabled(true); setStep("done"); setCode("");
      if (required) { setTimeout(() => router.push("/dashboard"), 1500); }
    } catch (e: unknown) { toast.error((e as Error).message); setCode(""); }
    finally { setLoading(false); }
  }

  async function disableTotp() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/totp/disable`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error?.message ?? "Invalid code");
      toast.success("Two-factor authentication disabled."); setEnabled(false); setStep("idle"); setCode("");
    } catch (e: unknown) { toast.error((e as Error).message); setCode(""); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Two-Factor Authentication</h1>
        <p className="text-slate-500 text-sm mt-1">Secure your account with an authenticator app.</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Authenticator App</p>
            <p className="text-slate-500 text-xs mt-0.5">Google Authenticator, Authy, or any TOTP app</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-400"}`} />
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {step === "idle" && !enabled && (
          <Button onClick={startSetup} disabled={loading} className="w-full h-11 text-sm font-semibold rounded-lg border-none"
            style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",boxShadow:"0 4px 12px rgba(29,78,216,0.3)"}}>
            {loading ? "Setting up..." : "Set up 2FA"}
          </Button>
        )}

        {step === "setup" && (
          <div className="space-y-5">
            <div>
              <p className="font-semibold text-slate-800 text-sm">1. Scan this QR code</p>
              <p className="text-xs text-slate-500 mt-0.5">Open your authenticator app and scan below.</p>
            </div>
            {qrCode && <div className="flex justify-center"><img src={qrCode} alt="TOTP QR" className="w-48 h-48 rounded-lg border border-slate-200 p-2" /></div>}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-500 mb-1">Manual entry key</p>
              <p className="font-mono text-sm text-slate-800 break-all">{secret}</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-800 text-sm">2. Enter the 6-digit code</p>
              <Label className="text-slate-600 text-xs">Code from your authenticator app</Label>
              <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                className="h-11 text-center tracking-[0.4em] font-mono text-lg bg-white border-slate-200"
              />
            </div>
            <Button onClick={enableTotp} disabled={loading || code.length !== 6} className="w-full h-11 text-sm font-semibold rounded-lg border-none"
              style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",boxShadow:"0 4px 12px rgba(29,78,216,0.3)"}}>
              {loading ? "Verifying..." : "Enable 2FA"}
            </Button>
          </div>
        )}

        {(enabled || step === "done") && step !== "setup" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
              ✓ Your account is protected with two-factor authentication.
            </div>
            <details>
              <summary className="text-sm text-red-500 cursor-pointer hover:text-red-600 font-medium list-none">Disable 2FA</summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-500">Enter your current authenticator code to disable 2FA.</p>
                <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                  className="h-10 text-center tracking-[0.4em] font-mono bg-white border-slate-200"
                />
                <Button onClick={disableTotp} disabled={loading || code.length !== 6}
                  variant="destructive" className="w-full h-10 text-sm font-semibold rounded-lg">
                  {loading ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
