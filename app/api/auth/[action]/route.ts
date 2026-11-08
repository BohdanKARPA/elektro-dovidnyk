import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { clearSession, createUser, findUserByEmail, getCurrentUser, setSession, verifyPassword } from '@/lib/auth'
import { clientIp, sameOrigin } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'
import { unreadCount } from '@/lib/messages'

export const runtime = 'nodejs'

const email = z.string().trim().toLowerCase().email().max(120)
const registerSchema = z.object({
  name: z.string().trim().min(2).max(40),
  email,
  password: z.string().min(8).max(100),
})
const loginSchema = z.object({ email, password: z.string().min(1).max(100) })

type Ctx = { params: Promise<{ action: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { action } = await params
  if (action !== 'me') return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const user = await getCurrentUser()
  // Unread chat messages for the header badge (replies for users, new messages for admins).
  const unread = user ? await unreadCount(user).catch(() => 0) : 0
  return NextResponse.json({ user, unread }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { action } = await params
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (action === 'logout') {
    await clearSession()
    return NextResponse.json({ ok: true })
  }

  // Brute-force protection: 10 attempts per 15 minutes per IP.
  const limit = rateLimit(`auth:${clientIp(req)}`, 10, 15 * 60 * 1000)
  if (!limit.ok) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  const body = await req.json().catch(() => null)

  if (action === 'register') {
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    if (await findUserByEmail(parsed.data.email)) return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    const user = await createUser(parsed.data.name, parsed.data.email, parsed.data.password)
    await setSession(user._id)
    return NextResponse.json({ user }, { status: 201 })
  }

  if (action === 'login') {
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    const user = await findUserByEmail(parsed.data.email)
    // Same answer for unknown email and wrong password: no account enumeration.
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return NextResponse.json({ error: 'bad_credentials' }, { status: 401 })
    }
    if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 })
    await setSession(user._id)
    return NextResponse.json({ user: { _id: user._id, name: user.name, role: user.role } })
  }

  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}
