// In-memory SSE connection registry for real-time in-app notifications.
// Single-process registry — fine for this deployment's scale (one Railway
// instance). If the API ever scales horizontally, this would need to move
// to a shared pub/sub (e.g. Redis) so a push reaches a user regardless of
// which instance holds their connection.

type Sender = (data: string) => void;

const connections = new Map<string, Set<Sender>>();

export function subscribe(userId: string, send: Sender): () => void {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId)!.add(send);
  return () => {
    const set = connections.get(userId);
    if (!set) return;
    set.delete(send);
    if (set.size === 0) connections.delete(userId);
  };
}

export interface RapidNotification {
  type: string;
  documentId?: string;
  documentTitle?: string;
  documentCode?: string;
  message: string;
  createdAt: string;
}

export function pushToUser(userId: string, notification: RapidNotification): void {
  const subs = connections.get(userId);
  if (!subs || subs.size === 0) return;
  const frame = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const send of subs) {
    try { send(frame); } catch { /* connection likely dead; will be cleaned up on close */ }
  }
}

export function pushToUsers(userIds: string[], notification: RapidNotification): void {
  for (const id of userIds) pushToUser(id, notification);
}

export function connectedUserCount(): number {
  return connections.size;
}
