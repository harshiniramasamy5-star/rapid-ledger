/**
 * In-memory rate limiter for /auth/login brute-force protection.
 *
 * Limitation: state is process-local and resets on server restart.
 * This is intentional for the current single-instance Railway deployment.
 * Production upgrade path: replace Map with Redis (ioredis) for persistent,
 * distributed rate limiting across multiple instances.
 */

const attempts = new Map<string, { count: number; windowStart: number }>();
const MAX = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 min

export function checkRateLimit(ip: string): { allowed: boolean } {
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

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}
