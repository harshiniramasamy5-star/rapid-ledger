"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface PendingInvite {
  id: string;
  orgId: string;
  orgName: string;
  orgDomain?: string | null;
  orgLogoUrl?: string | null;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", creator: "Creator", approver: "Approver",
  decider: "Decider", performer: "Performer", viewer: "Viewer",
};

export function PendingInvites({ onAccepted }: { onAccepted?: () => void }) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ invites: PendingInvite[] }>("/orgs/invites/me");
      setInvites(data.invites ?? []);
    } catch {
      // silent — non-critical widget
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function accept(invite: PendingInvite) {
    setBusyId(invite.id);
    try {
      await api.post(`/orgs/join/${invite.token}`);
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      toast.success(`Joined ${invite.orgName}!`);
      onAccepted?.();
    } catch {
      toast.error("Failed to accept invite. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(invite: PendingInvite) {
    setBusyId(invite.id);
    try {
      await api.post(`/orgs/invites/${invite.id}/decline`);
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      toast.success(`Declined invite from ${invite.orgName}`);
    } catch {
      toast.error("Failed to decline invite. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!loaded || invites.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✉️</span>
          <h2 className="text-sm font-semibold text-slate-900">
            {invites.length === 1 ? "You have a pending workspace invitation" : `You have ${invites.length} pending workspace invitations`}
          </h2>
        </div>
        <div className="space-y-2">
          {invites.map(invite => (
            <div key={invite.id}
              className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{invite.orgName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invited as <span className="font-medium">{ROLE_LABEL[invite.role] ?? invite.role}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" disabled={busyId === invite.id}
                  onClick={() => decline(invite)}
                  className="h-8 text-xs">
                  Decline
                </Button>
                <Button size="sm" disabled={busyId === invite.id}
                  onClick={() => accept(invite)}
                  className="h-8 text-xs">
                  {busyId === invite.id ? "Joining…" : "Accept"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
