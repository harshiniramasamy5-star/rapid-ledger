"use client"


function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;};
import { useEffect, useState } from "react";
import type { ApiDocument } from "@/lib/types";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<ApiDocument | null>(null);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) { router.replace("/login"); return; }

      const [docRes, meRes] = await Promise.all([
        fetch(`${API}/documents/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/auth/me`,               { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const docData = await docRes.json();
      const meData  = await meRes.json();
      const d = docData?.data ?? docData;
      const myId = meData?.id ?? "";

      const creatorId    = typeof d?.createdBy === "object" ? d?.createdBy?.id : d?.createdBy;
      const editableStatus = ["draft", "needs_changes"].includes(d?.status ?? "");

      if (!editableStatus || creatorId !== myId) {
        toast.error("You do not have permission to edit this document");
        router.replace(`/documents/${params.id}`);
        return;
      }

      setDoc(d);
      setLoading(false);
    })();
  }, [params.id, router]);

  async function save() {
    if (!doc) return;
    setSaving(true);
    const token = getToken();
    const res = await fetch(`${API}/documents/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: doc.title,
        decisionSummary: doc.decisionSummary,
        businessContext: doc.businessContext,
        problemStatement: doc.problemStatement,
        proposedDecision: doc.proposedDecision,
        alternativesConsidered: doc.alternativesConsidered,
        riskLevel: doc.riskLevel,
        department: doc.department,
        complianceImpact: doc.complianceImpact,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Document updated");
      router.push(`/documents/${params.id}`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error?.message ?? "Failed to update");
    }
  }

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (!doc)    return <div className="p-8 text-slate-500">Document not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit {doc.documentCode} v{doc.version}</h1>
        <Button variant="outline" onClick={() => router.push(`/documents/${params.id}`)}>Cancel</Button>
      </div>
      <div className="space-y-4">
        <div><Label>Title</Label><Input value={doc.title ?? ""} onChange={e => setDoc({...doc, title: e.target.value})} /></div>
        <div><Label>Decision Summary</Label><Textarea value={doc.decisionSummary ?? ""} onChange={e => setDoc({...doc, decisionSummary: e.target.value})} /></div>
        <div><Label>Business Context</Label><Textarea value={doc.businessContext ?? ""} onChange={e => setDoc({...doc, businessContext: e.target.value})} /></div>
        <div><Label>Problem Statement</Label><Textarea value={doc.problemStatement ?? ""} onChange={e => setDoc({...doc, problemStatement: e.target.value})} /></div>
        <div><Label>Proposed Decision</Label><Textarea value={doc.proposedDecision ?? ""} onChange={e => setDoc({...doc, proposedDecision: e.target.value})} /></div>
        <div><Label>Alternatives Considered</Label><Textarea value={doc.alternativesConsidered ?? ""} onChange={e => setDoc({...doc, alternativesConsidered: e.target.value})} /></div>
        <div><Label>Department</Label><Input value={doc.department ?? ""} onChange={e => setDoc({...doc, department: e.target.value})} /></div>
        <div><Label>Risk Level</Label>
          <select value={doc.riskLevel ?? "low"} onChange={e => setDoc({...doc, riskLevel: e.target.value})} className="w-full border rounded px-3 py-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!doc.complianceImpact} onChange={e => setDoc({...doc, complianceImpact: e.target.checked})} />
            Compliance Impact
          </label>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
