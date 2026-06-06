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
