import 'server-only'

/**
 * Sliding-window rate limiter kept in memory. Good enough for one instance;
 * on serverless platforms each instance has its own window, so for production
 * swap this for a shared store (e.g. Upstash Redis / Vercel KV).
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((ts) => now - ts < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) }
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 10_000) hits.clear() // crude memory guard
  return { ok: true, retryAfter: 0 }
}
