import crypto from "crypto";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FRONTEND_URL   = process.env.FRONTEND_URL ?? "https://rapid-ledger.vercel.app";
const FROM           = "RAPID Ledger <onboarding@resend.dev>";

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping verification email");
    return;
  }
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: "Verify your email — RAPID Ledger",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#6366f1;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:24px">
            <span style="color:#fff;font-weight:700;font-size:14px">RL</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Verify your email</h2>
          <p style="color:#475569;margin:0 0 24px">Hi ${name}, click below to verify your RAPID Ledger account.</p>
          <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Verify email →</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[Email] Resend error:", err);
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: "Welcome to RAPID Ledger",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#0f172a">Welcome, ${name}!</h2>
          <p style="color:#475569">Your account is verified. You can now log in and start creating RAPID documents.</p>
          <a href="${FRONTEND_URL}/login" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Go to app →</a>
        </div>
      `,
    }),
  });
}

export async function sendInviteEmail(
  email: string,
  orgName: string,
  role: string,
  token: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping invite email");
    return;
  }
  const url = `${FRONTEND_URL}/join/${token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: email,
      subject: `You've been invited to ${orgName} on RAPID Ledger`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#6366f1;width:40px;height:40px;border-radius:10px;margin-bottom:24px;display:flex;align-items:center;justify-content:center">
            <span style="color:#fff;font-weight:700;font-size:14px">RL</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">You're invited</h2>
          <p style="color:#475569;margin:0 0 8px">You've been invited to join <strong>${orgName}</strong> on RAPID Ledger as <strong>${role}</strong>.</p>
          <p style="color:#475569;margin:0 0 24px">Click below to accept the invitation and get started.</p>
          <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation →</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">This invite expires in 7 days. If you weren't expecting this, ignore this email.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[Email] Resend invite error:", err);
  }
}

// ─── Approval / Status Notification Emails ───────────────────────────────────

export async function sendApprovalNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  documentTitle: string,
  documentCode: string,
  approverName: string,
  comment?: string
): Promise<void> {
  if (!RESEND_API_KEY) return;
  const url = `${FRONTEND_URL}/documents`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: recipientEmail,
      subject: `✅ Document Approved — ${documentCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#10b981;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:24px">
            <span style="color:#fff;font-weight:700;font-size:14px">✓</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Document Approved</h2>
          <p style="color:#475569;margin:0 0 8px">Hi ${recipientName},</p>
          <p style="color:#475569;margin:0 0 16px">
            <strong>${documentTitle}</strong> (${documentCode}) has been <strong style="color:#10b981">approved</strong> by ${approverName}.
          </p>
          ${comment ? `<div style="background:#f0fdf4;border-left:3px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px"><p style="margin:0;color:#064e3b;font-size:14px">"${comment}"</p></div>` : ""}
          <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">View Document →</a>
        </div>
      `,
    }),
  }).catch(e => console.error("[Email] Approval notification failed:", e));
}

export async function sendRejectionNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  documentTitle: string,
  documentCode: string,
  approverName: string,
  comment?: string
): Promise<void> {
  if (!RESEND_API_KEY) return;
  const url = `${FRONTEND_URL}/documents`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: recipientEmail,
      subject: `❌ Document Rejected — ${documentCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#ef4444;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:24px">
            <span style="color:#fff;font-weight:700;font-size:14px">✕</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Document Rejected</h2>
          <p style="color:#475569;margin:0 0 8px">Hi ${recipientName},</p>
          <p style="color:#475569;margin:0 0 16px">
            <strong>${documentTitle}</strong> (${documentCode}) has been <strong style="color:#ef4444">rejected</strong> by ${approverName}.
          </p>
          ${comment ? `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px"><p style="margin:0;color:#7f1d1d;font-size:14px">"${comment}"</p></div>` : ""}
          <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">View Document →</a>
        </div>
      `,
    }),
  }).catch(e => console.error("[Email] Rejection notification failed:", e));
}

export async function sendChangesRequestedEmail(
  recipientEmail: string,
  recipientName: string,
  documentTitle: string,
  documentCode: string,
  reviewerName: string,
  comment?: string
): Promise<void> {
  if (!RESEND_API_KEY) return;
  const url = `${FRONTEND_URL}/documents`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: recipientEmail,
      subject: `🔄 Changes Requested — ${documentCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <div style="background:#f59e0b;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:24px">
            <span style="color:#fff;font-weight:700;font-size:14px">↺</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">Changes Requested</h2>
          <p style="color:#475569;margin:0 0 8px">Hi ${recipientName},</p>
          <p style="color:#475569;margin:0 0 16px">
            <strong>${reviewerName}</strong> has requested changes on <strong>${documentTitle}</strong> (${documentCode}).
          </p>
          ${comment ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px"><p style="margin:0;color:#78350f;font-size:14px">"${comment}"</p></div>` : ""}
          <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Review & Update →</a>
        </div>
      `,
    }),
  }).catch(e => console.error("[Email] Changes requested notification failed:", e));
}
