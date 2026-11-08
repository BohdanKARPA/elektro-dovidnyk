import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { moderate } from '@/lib/ai'
import { getComponents } from '@/lib/data'
import { sameOrigin } from '@/lib/http'
import { mem } from '@/lib/memory'
import { rateLimit } from '@/lib/rate-limit'
import { revalidateCommunity } from '@/lib/revalidate'
import { writeClient } from '@/lib/sanity'
import { slugify } from '@/lib/slug'

export const runtime = 'nodejs'

const schema = z.object({
  title: z.string().trim().min(8).max(140),
  body: z.string().trim().min(20).max(4000),
  related: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/).optional().or(z.literal('')),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
})

const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

/** Start a forum topic. Registered, non-blocked users only; 3 topics per hour for non-admins. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 })

  if (user.role !== 'admin') {
    const limit = rateLimit(`topic:${user._id}`, 3, 60 * 60 * 1000)
    if (!limit.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })

  const title = clean(parsed.data.title)
  const body = clean(parsed.data.body)
  const related = parsed.data.related || undefined
  if (related && !(await getComponents()).some((c) => c._id === related)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // AI moderation hides abusive topics until an admin reviews them.
  const mod = user.role === 'admin' ? null : await moderate(`${title}\n${body}`)
  const hidden = Boolean(mod?.flagged)
  const slug = `${slugify(title)}-${randomBytes(2).toString('hex')}`
  const createdAt = new Date().toISOString()

  if (writeClient) {
    await writeClient.create({
      _type: 'topic',
      title,
      slug: { _type: 'slug', current: slug },
      body,
      authorName: user.name,
      author: { _type: 'reference', _ref: user._id, _weak: true },
      ...(related && { related: { _type: 'reference', _ref: related } }),
      pinned: false,
      hidden,
      createdAt,
    })
  } else {
    mem.topics.push({ _id: `t-${randomBytes(6).toString('hex')}`, title, slug, body, authorName: user.name, userId: user._id, related, createdAt, hidden })
  }

  revalidateCommunity()
  return NextResponse.json({ slug, status: hidden ? 'hidden' : 'published' }, { status: 201 })
}
