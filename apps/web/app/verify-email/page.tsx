"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

type State = "loading" | "success" | "error"

function VerifyContent() {
  const params = useSearchParams()
  const token = params.get("token")
  const [state, setState] = useState<State>("loading")
  const [message, setMessage] = useState("")
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)
  const [userEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("email") ?? ""
    }
    return ""
  })

  async function handleResend() {
    if (!userEmail) return
    setResending(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      })
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (!token) { setState("error"); setMessage("We've sent a verification link to your inbox. Click it to activate your account."); return }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) setState("success")
        else if (d.error?.code === "ALREADY_USED") {
          // Token already consumed (e.g. Outlook Safe Links pre-fetch) — likely already verified
          setState("success")
        }
        else { setState("error"); setMessage(d.error?.message ?? "Verification failed.") }
      })
      .catch(() => { setState("error"); setMessage("Network error. Try again.") })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="w-full max-w-[380px] text-center">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">RL</span>
          </div>
          <span className="text-slate-900 font-bold text-sm">RAPID Ledger</span>
        </div>

        {state === "loading" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
              <span className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin inline-block" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Verifying your email</h1>
            <p className="text-slate-500 text-sm">Just a moment.</p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Email verified</h1>
            <p className="text-slate-500 text-sm">Your account is active. You can sign in.</p>
            <Link href="/login" className="inline-block mt-3 px-6 py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors">
              Sign in
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Verification failed</h1>
            <p className="text-slate-500 text-sm">{message || "This link is invalid or already used."}</p>
            {userEmail && !resent && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-block mt-2 px-5 py-2 border border-blue-200 text-sm text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend verification email"}
              </button>
            )}
            {resent && <p className="text-sm text-emerald-600 mt-2">✓ Verification email resent!</p>}
            <Link href="/signup" className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Back to sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
