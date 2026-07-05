// Serverless-safe-ish IP rate limiter (sliding window).
//
// IMPORTANT: this is an in-memory limiter — state lives in a single serverless
// instance and is NOT shared across Vercel's function instances or cold starts.
// It meaningfully throttles abuse from a single warm instance, but for strict,
// globally-consistent limits at production scale, swap this for Upstash Redis:
//
//   import { Ratelimit } from "@upstash/ratelimit";
//   import { Redis } from "@upstash/redis";
//   const rl = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(10, "60 s"),
//   });
//   const { success } = await rl.limit(ip);
//
// (Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars.)

const store = new Map<string, number[]>();
let lastSweep = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window frees up (when not allowed). */
  resetMs: number;
}

/**
 * Records a hit for `key` and reports whether it's within `limit` per `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Periodically drop stale keys so the map can't grow unbounded.
  if (now - lastSweep > windowMs) {
    store.forEach((times, k) => {
      const kept = times.filter((t) => now - t < windowMs);
      if (kept.length) store.set(k, kept);
      else store.delete(k);
    });
    lastSweep = now;
  }

  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    store.set(key, recent);
    const oldest = recent[0];
    return { allowed: false, remaining: 0, resetMs: windowMs - (now - oldest) };
  }

  recent.push(now);
  store.set(key, recent);
  return { allowed: true, remaining: limit - recent.length, resetMs: windowMs };
}
