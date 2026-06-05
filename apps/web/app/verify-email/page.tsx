"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("No verification token found."); return; }
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/verify-email?token=${token}`
    )
      .then(r => r.json())
      .then(d => {
        if (d?.message) { setStatus("success"); setMessage(d.message); }
        else { setStatus("error"); setMessage(d?.error?.message ?? "Verification failed."); }
      })
      .catch(() => { setStatus("error"); setMessage("Network error. Please try again."); });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-[380px] text-center space-y-5">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">RL</span>
          </div>
          <span className="text-slate-900 font-bold text-lg">RAPID Ledger</span>
        </div>

        {status === "loading" && (
          <>
            <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 text-sm">Verifying your email...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Email verified!</h2>
            <p className="text-slate-500 text-sm">{message}</p>
            <Link href="/login"
              className="inline-block mt-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}}>
              Sign in to your account →
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verification failed</h2>
            <p className="text-slate-500 text-sm">{message}</p>
            <Link href="/signup" className="inline-block text-sm text-blue-600 hover:text-blue-700 font-medium">
              Try signing up again →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}
