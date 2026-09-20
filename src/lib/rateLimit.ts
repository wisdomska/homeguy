/**
 * A per-process token bucket. Good enough for "Check these now" and the
 * paste endpoint on a single region; swap for Upstash or Vercel KV when
 * there is more than one instance to coordinate.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
