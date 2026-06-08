
"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields required"); return;
    }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Account created! Check your email to verify your account.");
        // Pass email as param so the verify-email page can offer resend
        setTimeout(() => router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`), 1000);
      } else {
        toast.error(data?.error?.message ?? "Registration failed");
      }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-primary-foreground font-bold text-xl">RL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Join RAPID Ledger — decision governance platform</p>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sign up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Full name</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Harshini Ramasamy" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Work email</label>
              <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Password</label>
              <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRegister()} />
            </div>
            <Button className="w-full h-11 font-semibold" disabled={loading} onClick={handleRegister}>
              {loading ? "Creating account…" : "Create Account →"}
            </Button>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <button className="text-primary font-semibold hover:underline" onClick={() => router.push("/login")}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
