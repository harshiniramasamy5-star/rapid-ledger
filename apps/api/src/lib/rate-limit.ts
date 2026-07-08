/**
 * In-memory rate limiter for auth brute-force protection (login, TOTP, etc).
 *
 * Limitation: state is process-local and resets on server restart.
 * This is intentional for the current single-instance Railway deployment.
 * Production upgrade path: replace Map with Redis (ioredis) for persistent,
 * distributed rate limiting across multiple instances.
 */

const attempts = new Map<string, { count: number; windowStart: number }>();
const DEFAULT_MAX = 100;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 min

/**
 * @param key identifier to rate-limit on (e.g. IP for login, `totp:${userId}` for TOTP)
 * @param max max attempts allowed within the window (default 100, matches existing /auth/login behavior)
 * @param windowMs window size in ms (default 15 min)
 */
export function checkRateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): { allowed: boolean } {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.windowStart > windowMs) {
    attempts.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (rec.count >= max) return { allowed: false };
  rec.count++;
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
