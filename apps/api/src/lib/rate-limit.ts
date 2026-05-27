// Minimal in-memory rate limiter — no Redis required
const attempts = new Map<string, { count: number; windowStart: number }>();
const MAX = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 min

export function checkLoginRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (rec.count >= MAX) return { allowed: false };
  rec.count++;
  return { allowed: true };
}

export function resetLoginAttempts(ip: string): void {
  attempts.delete(ip);
}
