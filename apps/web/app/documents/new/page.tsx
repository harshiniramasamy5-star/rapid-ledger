"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  recommend: { label: "R — Recommend", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", desc: "Recommends the decision" },
  agree:     { label: "A — Agree",     color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     desc: "Must agree before finalizing" },
  perform:   { label: "P — Perform",   color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",desc: "Executes the decision" },
  input:     { label: "I — Input",     color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   desc: "Provides input only" },
  decide:    { label: "D — Decide",    color: "text-red-700",    bg: "bg-red-50 border-red-200",        desc: "Final decision authority" },
};

export default function NewDocumentPage() {
  const router = useRouter();
  const [users, setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep]     = useState(1);
  const [docId, setDocId]   = useState<string|null>(null);
  const [form, setForm]     = useState({
    title: "", decisionSummary: "", businessContext: "",
    problemStatement: "", proposedDecision: "", alternativesConsidered: "",
    riskLevel: "low", complianceImpact: false, department: "", deadline: "",
  });
  const [roles, setRoles] = useState<Record<string,string>>({
    recommend: "", agree: "", perform: "", input: "", decide: "",
  });
  const [evidence, setEvidence] = useState({
    title: "", type: "link", urlOrPath: "", description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("rapid_token");
    if (!token) { router.replace("/login"); return; }
    fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load users"));
  }, [router]);

  function token() { return localStorage.getItem("rapid_token") ?? ""; }
  function setF(field: string, value: any) { setForm(f => ({ ...f, [field]: value })); }

  async function createDocument() {
    if (!form.title || !form.decisionSummary || !form.department || !form.deadline) {
      toast.error("Please fill all required fields"); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, complianceImpact: Boolean(form.complianceImpact) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed");
      setDocId(data.id);
      toast.success("Document created! Now assign roles.");
      setStep(2);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  async function assignRoles() {
    if (!roles.decide) { toast.error("Decide owner is required"); return; }
    if (!roles.perform) { toast.error("Perform owner is required"); return; }
    if (!roles.recommend) { toast.error("Recommend owner is required"); return; }
    setLoading(true);
    try {
      for (const [roleType, userId] of Object.entries(roles)) {
        if (!userId) continue;
        await fetch(`${API}/documents/${docId}/roles`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ roleType, userId }),
        });
      }
      toast.success("Roles assigned! Add evidence next.");
      setStep(3);
    } catch { toast.error("Failed to assign roles"); }
    setLoading(false);
  }

  async function addEvidence() {
    setLoading(true);
    try {
      if (evidence.title) {
        await fetch(`${API}/documents/${docId}/evidence`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
          body: JSON.stringify(evidence),
        });
      }
      toast.success("Document ready!");
      router.push(`/documents/${docId}`);
    } catch { toast.error("Failed to add evidence"); }
    setLoading(false);
  }

  const steps = ["Document Details", "Assign Roles", "Add Evidence"];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">RAPID Ledger</p>
              <p className="text-xs text-slate-400 mt-0.5">New Document</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-500"
            onClick={() => router.push("/dashboard")}>
            Cancel
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New RAPID Document</h1>
          <p className="text-slate-500 text-sm mt-1">Complete 3 steps to create a governed decision document.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                step === i + 1 ? "bg-primary text-primary-foreground border-primary" :
                step > i + 1  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                 "bg-white text-slate-400 border-slate-200"
              }`}>
                <span className="flex-shrink-0">
                  {step > i + 1 ? "✓" : `${i + 1}`}
                </span>
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < steps.length - 1 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Document Details */}
        {step === 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Document Details</CardTitle>
              <CardDescription>Describe the decision that needs to be made.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Title <span className="text-red-500">*</span></Label>
                <Input placeholder="What decision needs to be made?" value={form.title}
                  onChange={e => setF("title", e.target.value)} className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Decision Summary <span className="text-red-500">*</span></Label>
                <textarea rows={2} placeholder="One clear sentence describing the decision."
                  value={form.decisionSummary} onChange={e => setF("decisionSummary", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Business Context</Label>
                <textarea rows={2} placeholder="Why does this decision matter?"
                  value={form.businessContext} onChange={e => setF("businessContext", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Problem Statement</Label>
                <textarea rows={2} placeholder="What problem are we solving?"
                  value={form.problemStatement} onChange={e => setF("problemStatement", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Proposed Decision</Label>
                <textarea rows={2} placeholder="Recommended course of action?"
                  value={form.proposedDecision} onChange={e => setF("proposedDecision", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Alternatives Considered</Label>
                <textarea rows={2} placeholder="Other options that were evaluated?"
                  value={form.alternativesConsidered} onChange={e => setF("alternativesConsidered", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-sm">Risk Level <span className="text-red-500">*</span></Label>
                  <Select value={form.riskLevel} onValueChange={v => setF("riskLevel", v)}>
                    <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-sm">Department <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. Engineering" value={form.department}
                    onChange={e => setF("department", e.target.value)} className="border-slate-200" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Deadline <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.deadline}
                  onChange={e => setF("deadline", e.target.value)} className="border-slate-200" />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input type="checkbox" id="compliance" checked={form.complianceImpact}
                  onChange={e => setF("complianceImpact", e.target.checked)}
                  className="w-4 h-4 rounded" />
                <label htmlFor="compliance" className="text-sm text-slate-700 cursor-pointer">
                  This decision has a <span className="font-semibold">compliance impact</span>
                  <span className="text-slate-400 ml-1">(requires evidence)</span>
                </label>
              </div>

              <Separator />
              <Button className="w-full h-11 font-semibold" onClick={createDocument} disabled={loading}>
                {loading ? "Creating..." : "Create Document →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Assign Roles */}
        {step === 2 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Assign RAPID Roles</CardTitle>
              <CardDescription>
                Assign team members to each role. Decide, Perform and Recommend are required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(ROLE_CONFIG).map(([roleType, cfg]) => (
                <div key={roleType} className={`p-3 rounded-lg border ${cfg.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-400">{cfg.desc}</span>
                    {["decide","perform","recommend"].includes(roleType) && (
                      <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">Required</Badge>
                    )}
                  </div>
                  <Select value={roles[roleType]} onValueChange={v => setRoles(r => ({ ...r, [roleType]: v }))}>
                    <SelectTrigger className="bg-white border-slate-200 text-sm h-9">
                      <SelectValue placeholder="-- Not assigned --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not assigned --</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} <span className="text-slate-400 capitalize">({u.role})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <Separator />
              <Button className="w-full h-11 font-semibold" onClick={assignRoles} disabled={loading}>
                {loading ? "Assigning..." : "Assign Roles →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3 — Evidence */}
        {step === 3 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Attach Evidence</CardTitle>
              <CardDescription>
                Add supporting evidence for this decision. Required for compliance-impacting decisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Title</Label>
                <Input placeholder="e.g. Security policy document" value={evidence.title}
                  onChange={e => setEvidence(v => ({ ...v, title: e.target.value }))}
                  className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Type</Label>
                <Select value={evidence.type} onValueChange={v => setEvidence(ev => ({ ...ev, type: v }))}>
                  <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="meeting_note">Meeting Note</SelectItem>
                    <SelectItem value="policy_reference">Policy Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">URL</Label>
                <Input placeholder="https://..." value={evidence.urlOrPath}
                  onChange={e => setEvidence(v => ({ ...v, urlOrPath: e.target.value }))}
                  className="border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-sm">Description</Label>
                <textarea rows={2} placeholder="What does this evidence show?"
                  value={evidence.description} onChange={e => setEvidence(v => ({ ...v, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-11 border-slate-200"
                  onClick={() => router.push(`/documents/${docId}`)}>
                  Skip
                </Button>
                <Button className="h-11 font-semibold" onClick={addEvidence} disabled={loading}>
                  {loading ? "Saving..." : "Finish →"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
