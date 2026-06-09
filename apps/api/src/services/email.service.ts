import nodemailer from "nodemailer";
import crypto from "crypto";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://portal-beta-bay.vercel.app";

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: { ciphers: "SSLv3" },
});

const FROM = `RAPID Ledger <${process.env.SMTP_USER}>`;

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  if (!process.env.SMTP_USER) { console.warn("[Email] SMTP_USER not set"); return; }
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM, to: email,
    subject: "Verify your email — RAPID Ledger",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a">Verify your email</h2>
      <p style="color:#475569">Hi ${name}, click below to verify your RAPID Ledger account.</p>
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Verify email →</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">Link expires in 24 hours.</p>
    </div>`,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (!process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: FROM, to: email,
    subject: "Welcome to RAPID Ledger",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a">Welcome, ${name}!</h2>
      <p style="color:#475569">Your account is verified. You can now log in.</p>
      <a href="${FRONTEND_URL}/login" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Go to app →</a>
    </div>`,
  });
}

export async function sendInviteEmail(email: string, orgName: string, role: string, token: string): Promise<void> {
  if (!process.env.SMTP_USER) { console.warn("[Email] SMTP_USER not set"); return; }
  const url = `${FRONTEND_URL}/join/${token}`;
  await transporter.sendMail({
    from: FROM, to: email,
    subject: `You've been invited to ${orgName} on RAPID Ledger`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a">You're invited</h2>
      <p style="color:#475569">You've been invited to join <strong>${orgName}</strong> as <strong>${role}</strong>.</p>
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation →</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">Expires in 7 days.</p>
    </div>`,
  });
}

export async function sendApprovalNotificationEmail(recipientEmail: string, recipientName: string, documentTitle: string, documentCode: string, approverName: string, comment?: string): Promise<void> {
  if (!process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: FROM, to: recipientEmail,
    subject: `✅ Document Approved — ${documentCode}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a">Document Approved</h2>
      <p style="color:#475569">Hi ${recipientName}, <strong>${documentTitle}</strong> (${documentCode}) has been approved by ${approverName}.</p>
      ${comment ? `<div style="background:#f0fdf4;border-left:3px solid #10b981;padding:12px 16px;margin-bottom:16px"><p style="margin:0;color:#064e3b">"${comment}"</p></div>` : ""}
      <a href="${FRONTEND_URL}/documents" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">View Document →</a>
    </div>`,
  });
}

export async function sendRejectionNotificationEmail(recipientEmail: string, recipientName: string, documentTitle: string, documentCode: string, approverName: string, comment?: string): Promise<void> {
  if (!process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: FROM, to: recipientEmail,
    subject: `❌ Document Rejected — ${documentCode}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a">Document Rejected</h2>
      <p style="color:#475569">Hi ${recipientName}, <strong>${documentTitle}</strong> (${documentCode}) has been rejected by ${approverName}.</p>
      ${comment ? `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 16px;margin-bottom:16px"><p style="margin:0;color:#7f1d1d">"${comment}"</p></div>` : ""}
      <a href="${FRONTEND_URL}/documents" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">View Document →</a>
    </div>`,
  });
}

export async function sendChangesRequestedEmail(recipientEmail: string, recipientName: string, documentTitle: string, documentCode: string, reviewerName: string, comment?: string): Promise<void> {
  if (!process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: FROM, to: recipientEmail,
    subject: `🔄 Changes Requested — ${documentCode}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a">Changes Requested</h2>
      <p style="color:#475569"><strong>${reviewerName}</strong> requested changes on <strong>${documentTitle}</strong> (${documentCode}).</p>
      ${comment ? `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;margin-bottom:16px"><p style="margin:0;color:#78350f">"${comment}"</p></div>` : ""}
      <a href="${FRONTEND_URL}/documents" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Review & Update →</a>
    </div>`,
  });
}
