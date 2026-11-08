import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser, type SiteUser } from './auth'
import { sameOrigin } from './http'
import { rateLimit } from './rate-limit'

/** Strip control characters (keep tabs and newlines) from user text. */
export const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()

/** Empty form fields mean "not given", not zero. */
export const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v)

/**
 * Shared checks for user submissions: same-origin request (CSRF), signed-in, not blocked.
 * Returns the user, or a ready error response.
 */
export async function guardSubmission(req: NextRequest, kind: 'component' | 'project'): Promise<SiteUser | NextResponse> {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 })
  return user
}

/**
 * Count a valid submission against the limit (3 per kind per hour for non-admins).
 * Called after validation, so a form with mistakes does not use up the quota,
 * and before the AI review, so floods never reach the AI provider.
 */
export function consumeQuota(user: SiteUser, kind: 'component' | 'project', edit = false): NextResponse | null {
  if (user.role === 'admin') return null
  // New submissions: 3 an hour. Fixes of a returned submission have their own, larger allowance.
  const limit = edit ? rateLimit(`resubmit:${user._id}`, 10, 60 * 60 * 1000) : rateLimit(`submit:${kind}:${user._id}`, 3, 60 * 60 * 1000)
  return limit.ok ? null : NextResponse.json({ error: 'too_many_requests', retryAfter: limit.retryAfter }, { status: 429 })
}
