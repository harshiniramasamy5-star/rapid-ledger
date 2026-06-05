"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw data;
      setDone(true);
    } catch (err: unknown) {
      toast.error(
        (err as { error?: { message?: string } })?.error?.message ??
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] px-14 py-12 relative overflow-hidden"
        style={{ background: "#0a0f1e" }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{backgroundImage:"radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 20% 80%, #6366f1 0%, transparent 50%)"}} />
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
              <span className="text-slate-400 text-[11px] font-medium tracking-wide uppercase">
                Compliant · Auditable · Secure
              </span>
            </div>
            <h2 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
              Decision governance<br />without compromise.
            </h2>
            <p className="text-slate-400 text-[15px] leading-relaxed max-w-[340px]">
              Create your account to start building structured RAPID documents with clear ownership and immutable audit trails.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Multi-stage approval workflows",
              "Immutable audit log & ledger",
              "Role-based access control",
              "Full governance traceability",
              "Regulatory reporting & exports",
            ].map(f => (
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
            <span className="text-slate-600 text-xs">Privacy</span>
            <span className="text-slate-600 text-xs">Security</span>
            <span className="text-slate-600 text-xs">Terms</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc] px-8 py-12">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">RL</span>
            </div>
            <span className="text-slate-900 font-bold">RAPID Ledger</span>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                We sent a verification link to <span className="font-semibold text-slate-700">{email}</span>.
                Click it to activate your account.
              </p>
              <Link href="/login"
                className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                Back to sign in →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[1.75rem] font-bold text-slate-900 tracking-tight">Create account</h1>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Join RAPID Ledger. Verify your email to get started.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-700 text-[13px] font-semibold tracking-wide">
                    Full Name
                  </Label>
                  <Input id="name" type="text" required autoComplete="name"
                    placeholder="Jane Smith" value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 text-[13px] font-semibold tracking-wide">
                    Work Email
                  </Label>
                  <Input id="email" type="email" required autoComplete="email"
                    placeholder="you@company.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-700 text-[13px] font-semibold tracking-wide">
                    Password
                  </Label>
                  <Input id="password" type="password" required autoComplete="new-password"
                    placeholder="Min. 8 characters" value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all"
                  />
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-11 text-sm font-semibold rounded-lg border-none mt-1"
                  style={{background:"linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)", boxShadow:"0 4px 12px rgba(29,78,216,0.3)"}}>
                  {loading ? (
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : "Create account"}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-slate-500 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
