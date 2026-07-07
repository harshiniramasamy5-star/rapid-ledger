import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import crypto from "crypto";

const ses = new SESClient({
  region: process.env.AWS_REGION ?? "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const FROM = process.env.EMAIL_FROM ?? "RAPID Ledger <info@complyance.io>";
const APP = () => process.env.FRONTEND_URL ?? "https://rapid-ledger.vercel.app";

async function sendEmail(to: string, subject: string, html: string) {
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    })
  );
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

export async function sendTaskUnlockedEmail(
  to: string,
  name: string,
  docTitle: string,
  docCode: string,
  actionRequired: string
) {
  await sendEmail(
    to,
    `Action needed: ${docTitle}`,
    `<p>Hi ${name},</p>
     <p>The previous stage on <strong>${docTitle}</strong> (${docCode}) is complete — it's now your turn to <strong>${actionRequired}</strong>.</p>
     <p><a href="${APP()}/tasks">View in Pending Tasks</a></p>`
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
