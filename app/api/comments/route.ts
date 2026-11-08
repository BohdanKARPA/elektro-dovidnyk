import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { writeClient } from '@/lib/sanity'
import { moderate } from '@/lib/ai'
import { rateLimit } from '@/lib/rate-limit'
import { targetExists } from '@/lib/data'
import { revalidateCommunity } from '@/lib/revalidate'
import { getCurrentUser } from '@/lib/auth'
import { sameOrigin } from '@/lib/http'
import { mem } from '@/lib/memory'

export const runtime = 'nodejs'

const schema = z.object({
  targetId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
  text: z.string().trim().min(3).max(2000),
  // Honeypot: real users never see this field, bots usually fill it in.
  website: z.string().max(0).optional().or(z.literal('')),
})

/** Strip control characters; React escapes the rest on output, so no HTML can be injected. */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // User restrictions: guests cannot post, blocked users cannot post.
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 })

  // Per-user limit: 5 comments per 10 minutes (admins are not limited).
  if (user.role !== 'admin') {
    const limit = rateLimit(`comment:${user._id}`)
    if (!limit.ok) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
    }
  }

  let input: z.infer<typeof schema>
  try {
    input = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  if (!(await targetExists(input.targetId))) return NextResponse.json({ error: 'unknown_target' }, { status: 404 })

  const text = clean(input.text)

  // Admin comments go live; others pass AI pre-moderation, or wait for an admin without AI.
  const mod = user.role === 'admin' ? null : await moderate(text)
  const status = user.role === 'admin' ? 'approved' : mod === null ? 'pending' : mod.flagged ? 'rejected' : 'approved'
  const createdAt = new Date().toISOString()

  if (writeClient) {
    await writeClient.create({
      _type: 'comment',
      authorName: user.name,
      text,
      status,
      target: { _type: 'reference', _ref: input.targetId, _weak: true },
      author: { _type: 'reference', _ref: user._id, _weak: true },
      createdAt,
      ...(mod && { aiModeration: { flagged: mod.flagged, categories: mod.categories, checkedAt: createdAt } }),
    })
  } else {
    mem.comments.push({
      _id: `c-${randomBytes(6).toString('hex')}`,
      authorName: user.name,
      text,
      status,
      target: input.targetId,
      userId: user._id,
      createdAt,
      aiFlagged: mod?.flagged,
    })
  }

  if (status === 'approved') revalidateCommunity()
  return NextResponse.json({ status }, { status: 201 })
}
