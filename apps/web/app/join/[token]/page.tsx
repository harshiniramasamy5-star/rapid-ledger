"use client"
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
function getToken(){ const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/); return m?decodeURIComponent(m[1]):null; }

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router    = useRouter();
  const [joining, setJoining] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!getToken()) router.replace(`/login?redirect=/join/${token}`);
  }, [token, router]);

  async function accept() {
    setJoining(true);
    const t = getToken();
    const res = await fetch(`${API}/orgs/join/${token}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    if (res.ok) { toast.success("Joined organisation!"); setDone(true); setTimeout(() => router.push("/dashboard"), 1500); }
    else { setError(data?.error?.message ?? data?.error ?? "Failed to join"); }
    setJoining(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-slate-200 shadow-sm">
        <CardHeader>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-sm">RL</span>
          </div>
          <CardTitle>{done ? "Joined! Redirecting…" : "Accept Invitation"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {!done && (
            <>
              <p className="text-sm text-slate-600">Click below to accept the invitation and join the organisation.</p>
              <Button className="w-full" disabled={joining} onClick={accept}>
                {joining ? "Joining…" : "Accept Invitation"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
