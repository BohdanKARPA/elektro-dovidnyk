import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { moderate } from '@/lib/ai'
import { findUserById, getCurrentUser } from '@/lib/auth'
import { sameOrigin } from '@/lib/http'
import { listThread, sendMessage, unreadCount } from '@/lib/messages'
import { rateLimit } from '@/lib/rate-limit'
import { listUserSubmissions } from '@/lib/submissions'
import { clean } from '@/lib/submit-guard'

export const runtime = 'nodejs'

const id = z.string().regex(/^[A-Za-z0-9._-]{1,128}$/)
const noStore = { 'Cache-Control': 'no-store' }

/**
 * GET  — messages of a conversation. Users read their own; admins pass ?thread=<userId>.
 * POST — send a message. Users write to the admins; admins reply in a user's thread.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  const requested = req.nextUrl.searchParams.get('thread')
  if (requested && user.role !== 'admin' && requested !== user._id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (requested && !id.safeParse(requested).success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  const thread = user.role === 'admin' && requested ? requested : user._id
  const viewer = user.role === 'admin' && thread !== user._id ? 'admin' : 'user'
  const messages = await listThread(thread, viewer)
  return NextResponse.json({ messages, unread: await unreadCount(user) }, { headers: noStore })
}

const schema = z.object({
  text: z.string().transform(clean).pipe(z.string().min(1).max(2000)),
  thread: id.optional(),
  about: id.optional().or(z.literal('').transform(() => undefined)),
})

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  const { text, about } = parsed.data

  const asAdmin = user.role === 'admin' && parsed.data.thread && parsed.data.thread !== user._id
  if (parsed.data.thread && !asAdmin && parsed.data.thread !== user._id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (asAdmin) {
    if (!(await findUserById(parsed.data.thread!))) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    await sendMessage({ thread: parsed.data.thread!, from: 'admin', authorName: user.name, text, about })
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  const limit = rateLimit(`msg:${user._id}`, 10, 10 * 60 * 1000)
  if (!limit.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  // A user may only refer to their own submissions.
  if (about && !(await listUserSubmissions(user._id)).some((s) => s._id === about)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  const mod = await moderate(text)
  if (mod?.flagged) return NextResponse.json({ error: 'flagged' }, { status: 422 })

  await sendMessage({ thread: user._id, from: 'user', authorName: user.name, text, about })
  return NextResponse.json({ ok: true }, { status: 201 })
}
