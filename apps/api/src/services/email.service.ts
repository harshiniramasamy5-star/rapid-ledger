import nodemailer from "nodemailer";
import crypto from "crypto";

const transport = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

const FROM = "RAPID Ledger <onboarding@resend.dev>";
const APP = () => process.env.FRONTEND_URL ?? "https://rapid-ledger.vercel.app";

async function sendEmail(to: string, subject: string, html: string) {
  await transport.sendMail({ from: FROM, to, subject, html });
}

export function generateVerificationToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${APP()}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your RAPID Ledger account",
    `<p>Hi ${name},</p>
     <p>Click below to verify your email:</p>
     <p><a href="${url}">${url}</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail(
    to,
    "Welcome to RAPID Ledger",
    `<p>Hi ${name},</p>
     <p>Your account is verified and ready. Welcome aboard!</p>
     <p><a href="${APP()}/documents">Go to RAPID Ledger</a></p>`
  );
}

export async function sendInviteEmail(to: string, orgName: string, role: string, token: string) {
  const url = `${APP()}/invite/accept?token=${token}`;
  await sendEmail(
    to,
    `You're invited to ${orgName} on RAPID Ledger`,
    `<p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
     <p><a href="${url}">Accept Invitation</a></p>
     <p>This link expires in 7 days.</p>`
  );
}

export async function sendSubmissionEmail(
  to: string,
  name: string,
  docTitle: string,
  docCode: string,
  submitterName: string
) {
  await sendEmail(
    to,
    `Review requested: ${docTitle}`,
    `<p>Hi ${name},</p>
     <p><strong>${submitterName}</strong> submitted <strong>${docTitle}</strong> (${docCode}) for your review.</p>
     <p><a href="${APP()}/documents">Review in RAPID Ledger</a></p>`
  );
}

export async function sendApprovalNotificationEmail(
  to: string,
  name: string,
  docTitle: string,
  docCode: string,
  approverName: string
) {
  await sendEmail(
    to,
    `Document approved: ${docTitle}`,
    `<p>Hi ${name},</p>
     <p>Your document <strong>${docTitle}</strong> (${docCode}) was approved by <strong>${approverName}</strong>.</p>
     <p><a href="${APP()}/documents">View in RAPID Ledger</a></p>`
  );
}

export async function sendRejectionNotificationEmail(
  to: string,
  name: string,
  docTitle: string,
  docCode: string,
  approverName: string,
  reason?: string
) {
  await sendEmail(
    to,
    `Document rejected: ${docTitle}`,
    `<p>Hi ${name},</p>
     <p>Your document <strong>${docTitle}</strong> (${docCode}) was rejected by <strong>${approverName}</strong>.</p>
     ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
     <p><a href="${APP()}/documents">View in RAPID Ledger</a></p>`
  );
}

export async function sendChangesRequestedEmail(
  to: string,
  name: string,
  docTitle: string,
  docCode: string,
  reviewerName: string,
  comment?: string
) {
  await sendEmail(
    to,
    `Changes requested: ${docTitle}`,
    `<p>Hi ${name},</p>
     <p><strong>${reviewerName}</strong> requested changes on <strong>${docTitle}</strong> (${docCode}).</p>
     ${comment ? `<p><strong>Notes:</strong> ${comment}</p>` : ""}
     <p><a href="${APP()}/documents">View in RAPID Ledger</a></p>`
  );
}
