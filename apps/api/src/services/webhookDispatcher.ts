import { prisma } from "../lib/prisma";

export type WebhookEvent =
  | "document.approved"
  | "document.rejected"
  | "transcript.created"
  | "transcript.updated"
  | "document.published";

export interface WebhookPayload {
  documentId: string;
  userId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface WebhookHandler {
  handle(event: WebhookEvent, payload: WebhookPayload): Promise<void>;
}

class WebhookDispatcher {
  private handlers: Map<WebhookEvent, WebhookHandler[]> = new Map();

  register(event: WebhookEvent, handler: WebhookHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
    console.log("[WebhookDispatcher] Registered handler for " + event);
  }

  async dispatch(event: WebhookEvent, payload: WebhookPayload): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
    if (handlers.length === 0) {
      console.log("[WebhookDispatcher] No handlers for " + event);
      return;
    }
    console.log("[WebhookDispatcher] Dispatching " + event + " to " + handlers.length + " handler(s)");
    const results = await Promise.allSettled(
      handlers.map((h) => h.handle(event, payload)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[WebhookDispatcher] Handler error:", result.reason);
        try {
          await prisma.auditLog.create({
            data: {
              userId: payload.userId,
              action: "webhook_failed",
              entityType: "RapidDocument",
              entityId: payload.documentId,
              documentId: payload.documentId,
              details: JSON.stringify({ event, error: String(result.reason) }),
            },
          });
        } catch (logErr) {
          console.error("[WebhookDispatcher] Failed to log failure:", logErr);
        }
      }
    }
  }
}

export const webhookDispatcher = new WebhookDispatcher();
