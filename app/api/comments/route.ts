import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { writeClient } from '@/lib/sanity'
import { moderate } from '@/lib/ai'
import { rateLimit } from '@/lib/rate-limit'
import { COMMENTABLE_TYPES } from '@/lib/data'

export const runtime = 'nodejs'

const schema = z.object({
  targetId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
  authorName: z.string().trim().min(2).max(40),
  text: z.string().trim().min(3).max(2000),
  // Honeypot: real users never see this field, bots usually fill it in.
  website: z.string().max(0).optional().or(z.literal('')),
})

/** Strip control characters; React escapes the rest on output, so no HTML can be injected. */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // CSRF: only accept requests sent by our own pages.
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const limit = rateLimit(`comment:${ip}`)
  if (!limit.ok) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  }

  let input: z.infer<typeof schema>
  try {
    input = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  if (!writeClient) return NextResponse.json({ error: 'cms_not_configured' }, { status: 503 })

  // The target must exist and be of a commentable type.
  const target = await writeClient.fetch<string | null>(
    `*[_id == $id && _type in $types][0]._id`,
    { id: input.targetId, types: COMMENTABLE_TYPES },
  )
  if (!target) return NextResponse.json({ error: 'unknown_target' }, { status: 404 })

  const authorName = clean(input.authorName)
  const text = clean(input.text)

  // AI pre-moderation: clean comments go live, flagged ones are rejected,
  // and without AI (or on AI error) everything waits for a human moderator.
  const mod = await moderate(`${authorName}\n${text}`)
  const status = mod === null ? 'pending' : mod.flagged ? 'rejected' : 'approved'

  await writeClient.create({
    _type: 'comment',
    authorName,
    text,
    status,
    target: { _type: 'reference', _ref: target, _weak: true },
    createdAt: new Date().toISOString(),
    ...(mod && { aiModeration: { flagged: mod.flagged, categories: mod.categories, checkedAt: new Date().toISOString() } }),
  })

  if (status === 'approved') revalidateTag('comment', { expire: 0 })

  return NextResponse.json({ status }, { status: 201 })
}
