"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function LedgerPage() {
  const router  = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rapid_token");
    if (!token) { router.replace("/login"); return; }
    fetch((process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/ledger", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load ledger"))
      .finally(() => setLoading(false));
  }, [router]);

  async function exportCSV() {
    const token = localStorage.getItem("rapid_token");
    try {
      const res  = await fetch((process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/ledger/export", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "rapid-ledger-export.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Export failed");
    }
  }

  function exportMarkdown() {
    let md = "# RAPID Ledger Export\n\n";
    md += `Generated: ${new Date().toLocaleString()}\n\n---\n\n`;
    entries.forEach((e, i) => {
      md += `## ${i + 1}. ${e.documentCode} v${e.version}\n\n`;
      md += `**Title:** ${e.title}\n\n**Final Decision:** ${e.finalDecision}\n\n`;
      md += `**Risk Level:** ${e.riskLevel}\n\n**Compliance Impact:** ${e.complianceImpact ? "Yes" : "No"}\n\n`;
      md += `**Decide Owner:** ${e.decideOwner?.name ?? "Unknown"}\n\n`;
      md += `**Finalized:** ${new Date(e.finalizedAt).toLocaleString()}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `rapid-ledger-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown exported successfully");
  }

  const RISK_COLORS: Record<string, string> = {
    low: "text-emerald-600", medium: "text-amber-600",
    high: "text-orange-600", critical: "text-red-600",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">RAPID Ledger</p>
              <p className="text-xs text-slate-400 mt-0.5">Compliance Invoicing Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportMarkdown}>
              Export Markdown
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <Button variant="ghost" size="sm" className="text-slate-500"
              onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">RAPID Ledger</h1>
            <p className="text-slate-500 text-sm mt-1">
              Permanent read-only records of all finalized decisions.
            </p>
          </div>
          <Badge variant="outline" className="text-slate-500 border-slate-200 mt-1">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </Badge>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading ledger...</p>
          </div>
        ) : entries.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">📒</div>
              <h3 className="text-lg font-semibold text-slate-900">No ledger entries yet</h3>
              <p className="text-slate-400 text-sm mt-1">
                Entries appear here when a Decision Owner finalizes a document.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => (
              <Card key={entry.id} className="border-slate-200 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-400">{entry.documentCode}</span>
                        <span className="text-xs text-slate-400">v{entry.version}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          FINALIZED
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{entry.title}</h3>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <span className={`text-sm font-semibold capitalize ${RISK_COLORS[entry.riskLevel] ?? "text-slate-600"}`}>
                        {entry.riskLevel} risk
                      </span>
                      {entry.complianceImpact === 1 && (
                        <Badge variant="secondary">Compliance</Badge>
                      )}
                    </div>
                  </div>

                  {/* Final decision */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Final Decision
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{entry.finalDecision}</p>
                  </div>

                  <Separator />

                  {/* Meta grid */}
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Decide Owner
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {entry.decideOwner?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">{entry.decideOwner?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Perform Owner
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {entry.performOwner?.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">{entry.performOwner?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Finalized On
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(entry.finalizedAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(entry.finalizedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Showing {entries.length} entries · Ledger is immutable and read-only
        </p>
      </main>
    </div>
  );
}
