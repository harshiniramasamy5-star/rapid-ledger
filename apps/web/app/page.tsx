"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;}

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    if (token) router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">RL</span>
          </div>
          <span className="font-semibold text-white">RAPID Ledger</span>
          <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full ml-1">Beta</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">Sign in</a>
          <a href="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors font-medium">Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs text-indigo-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
          Now with AI-powered transcript analysis
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Decision governance<br/>
          <span className="text-indigo-400">without compromise</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          RAPID Ledger transforms compliance decision-making from scattered emails into a structured, auditable workflow — with AI role assignment, immutable audit trails, and automatic Notion + Linear sync.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/register" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm">
            Start for free →
          </a>
          <a href="https://rapid-ledger-production.up.railway.app/api/docs" target="_blank" rel="noreferrer"
            className="px-6 py-3 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
            View API docs
          </a>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="border border-white/5 rounded-2xl bg-white/[0.02] p-8">
          <p className="text-xs text-slate-500 uppercase tracking-widest text-center mb-8">The RAPID workflow</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { step: "R", label: "Recommend", desc: "Expert analysis", color: "bg-blue-600/20 border-blue-500/30 text-blue-400" },
              { step: "A", label: "Agree", desc: "Stakeholder sign-off", color: "bg-green-600/20 border-green-500/30 text-green-400" },
              { step: "P", label: "Perform", desc: "Execute decision", color: "bg-purple-600/20 border-purple-500/30 text-purple-400" },
              { step: "I", label: "Input", desc: "Contextual data", color: "bg-amber-600/20 border-amber-500/30 text-amber-400" },
              { step: "D", label: "Decide", desc: "Final authority", color: "bg-red-600/20 border-red-500/30 text-red-400" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`border rounded-xl p-4 text-center w-28 ${r.color}`}>
                  <div className="text-2xl font-bold mb-1">{r.step}</div>
                  <div className="text-xs font-semibold">{r.label}</div>
                  <div className="text-xs opacity-60 mt-0.5">{r.desc}</div>
                </div>
                {i < 4 && <span className="text-slate-600 text-lg">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <p className="text-xs text-slate-500 uppercase tracking-widest text-center mb-10">Built for enterprise compliance</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: "🤖", title: "AI Role Assignment", desc: "Groq LLaMA analyzes meeting transcripts and assigns RAPID roles to each participant automatically." },
            { icon: "🔒", title: "Immutable Audit Trail", desc: "Every action generates an immutable audit log. Full compliance trail from transcript to approval." },
            { icon: "📋", title: "Notion Sync", desc: "Approved decisions automatically sync to your Notion compliance archive. Zero manual export." },
            { icon: "⚡", title: "Linear Integration", desc: "Document approvals auto-create Linear issues for the Perform role owner. Decision → action." },
            { icon: "🔐", title: "Enterprise Auth", desc: "Email verification, TOTP 2FA, account lockout, rate limiting, and domain-restricted registration." },
            { icon: "📊", title: "Analytics Dashboard", desc: "Real-time charts showing decision status, risk distribution, and department breakdown." },
          ].map((f, i) => (
            <div key={i} className="border border-white/5 rounded-xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-white/[0.01] py-10 mb-20">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "118", label: "Tests passing" },
            { value: "2FA", label: "Security enforced" },
            { value: "3", label: "Integrations live" },
            { value: "100%", label: "Audit coverage" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-8 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to govern decisions?</h2>
        <p className="text-slate-400 text-sm mb-8">Join Complyance in building compliance-grade decision workflows.</p>
        <a href="/register" className="inline-block px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
          Get started free →
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">RL</span>
            </div>
            <span className="text-xs text-slate-500">RAPID Ledger by Complyance</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="/login" className="hover:text-slate-300">Sign in</a>
            <a href="https://rapid-ledger-production.up.railway.app/api/docs" target="_blank" rel="noreferrer" className="hover:text-slate-300">API Docs</a>
            <a href="https://github.com/harshiniramasamy5-star/rapid-ledger" target="_blank" rel="noreferrer" className="hover:text-slate-300">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
