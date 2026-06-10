import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const FROM = "RAPID Ledger <info@complyance.io>";

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

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your RAPID Ledger account",
    `<p>Click below to verify your email:</p>
     <p><a href="${url}">${url}</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

export async function sendApprovalEmail(to: string, docTitle: string) {
  await sendEmail(
    to,
    `Document Approved: ${docTitle}`,
    `<p>Your document <strong>${docTitle}</strong> has been approved.</p>
     <p><a href="${process.env.FRONTEND_URL}/documents">View in RAPID Ledger</a></p>`
  );
}

export async function sendRejectionEmail(to: string, docTitle: string, reason?: string) {
  await sendEmail(
    to,
    `Document Rejected: ${docTitle}`,
    `<p>Your document <strong>${docTitle}</strong> was rejected.</p>
     ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
     <p><a href="${process.env.FRONTEND_URL}/documents">View in RAPID Ledger</a></p>`
  );
}

export async function sendChangesRequestedEmail(to: string, docTitle: string, notes?: string) {
  await sendEmail(
    to,
    `Changes Requested: ${docTitle}`,
    `<p>Changes have been requested on <strong>${docTitle}</strong>.</p>
     ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
     <p><a href="${process.env.FRONTEND_URL}/documents">View in RAPID Ledger</a></p>`
  );
}

export function generateVerificationToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function sendInviteEmail(
  to: string,
  orgName: string,
  role: string,
  token: string
) {
  const url = `${process.env.FRONTEND_URL}/invite/accept?token=${token}`;
  await sendEmail(
    to,
    `You're invited to ${orgName} on RAPID Ledger`,
    `<p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
     <p><a href="${url}">Accept Invitation</a></p>
     <p>This link expires in 7 days.</p>`
  );
}
