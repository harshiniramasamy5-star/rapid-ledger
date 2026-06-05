"use client"
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading"|"success"|"error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); setMsg("No token found."); return; }
    fetch(`${API}/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setStatus("error"); setMsg(d.error.message); }
        else { setStatus("success"); setMsg(d.message); setTimeout(() => router.push("/login"), 2500); }
      })
      .catch(() => { setStatus("error"); setMsg("Something went wrong."); });
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-sm w-full text-center shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mx-auto mb-6">
        <span className="text-white font-bold text-sm">RL</span>
      </div>
      {status === "loading" && <p className="text-slate-500">Verifying your email…</p>}
      {status === "success" && (
        <>
          <div className="text-4xl mb-4">✅</div>
          <h2 className="font-bold text-slate-900 text-lg mb-2">Email verified!</h2>
          <p className="text-slate-500 text-sm">{msg}</p>
          <p className="text-slate-400 text-xs mt-3">Redirecting to login…</p>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-4xl mb-4">❌</div>
          <h2 className="font-bold text-slate-900 text-lg mb-2">Verification failed</h2>
          <p className="text-slate-500 text-sm">{msg}</p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Suspense fallback={<div className="text-slate-500">Loading…</div>}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
