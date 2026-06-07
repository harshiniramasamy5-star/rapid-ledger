"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      router.push("/login?registered=1");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left panel — matches login */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1117] text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-sm font-bold">RL</div>
          <div>
            <div className="font-semibold text-sm">RAPID Ledger</div>
            <div className="text-xs text-gray-400">BY COMPLYANCE</div>
          </div>
        </div>
        <div>
          <div className="inline-flex items-center gap-2 border border-gray-700 rounded-full px-4 py-1 text-xs text-gray-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            COMPLIANT · AUDITABLE · SECURE
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Decision governance<br />without compromise.
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            Turn every important decision into a structured RAPID document with clear ownership, approval workflows, and immutable audit trails.
          </p>
          <ul className="space-y-3 text-sm text-gray-300">
            {["Multi-stage approval workflows","Immutable audit log & ledger","Role-based access control","Full governance traceability","Regulatory reporting & exports"].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />{f}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-gray-600">© 2026 Complyance Inc. All rights reserved.</div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 bg-white relative">
        <div className="absolute top-6 right-6 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-gray-900 hover:underline">Sign in</Link>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-6">Set up your RAPID Ledger workspace access.</p>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Jane Smith"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="you@antna.co.in"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => setForm({...form, confirm: e.target.value})}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !form.name || !form.email || !form.password || !form.confirm}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-md text-sm transition-colors"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Access is provisioned by your system administrator. Contact IT support if you are unable to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}