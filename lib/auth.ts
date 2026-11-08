import 'server-only'
import { cookies } from 'next/headers'
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { writeClient } from './sanity'
import { mem } from './memory'

/**
 * Users, roles and sessions.
 *
 *   guest  (no session) — reads the site
 *   user   — comments, starts forum topics, sees own moderation status; can be blocked
 *   admin  — everything a user can do, plus the /admin panel
 *
 * With SANITY_API_WRITE_TOKEN users are Sanity documents whose _id starts with
 * "users." — documents in an ID path are never served to unauthenticated API
 * requests, so emails and password hashes stay private even on a public dataset.
 * Without a token they live in server memory (local mode).
 */
export type Role = 'user' | 'admin'
export interface SiteUser {
  _id: string
  name: string
  email: string
  role: Role
  blocked: boolean
  createdAt?: string
}
type StoredUser = SiteUser & { passwordHash: string }

const COOKIE = 'session'
const SESSION_DAYS = 7

const SECRET = process.env.AUTH_SECRET || 'dev-only-secret-change-me'
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[auth] AUTH_SECRET is not set — sessions are signed with a development key.')
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

/* ---------------- passwords: scrypt (N=16384) with a random 16-byte salt ---------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  const [salt, hash] = (stored ?? '').split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/* ---------------- session: base64url(payload).HMAC-SHA256 in an httpOnly cookie ---------------- */

const sign = (value: string) => createHmac('sha256', SECRET).update(value).digest('base64url')

function makeToken(uid: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function readToken(token: string | undefined): string | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof data.uid === 'string' && typeof data.exp === 'number' && data.exp > Date.now() ? data.uid : null
  } catch {
    return null
  }
}

export async function setSession(uid: string) {
  const jar = await cookies()
  jar.set(COOKIE, makeToken(uid), {
    httpOnly: true, // not readable from JavaScript (XSS cannot steal it)
    sameSite: 'lax', // not sent on cross-site POSTs (CSRF)
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  })
}

export async function clearSession() {
  ;(await cookies()).delete(COOKIE)
}

/* ---------------- user store ---------------- */

const publicFields = `_id, name, email, "role": coalesce(role, "user"), "blocked": coalesce(blocked, false), createdAt`
const strip = ({ passwordHash: _hash, ...user }: StoredUser): SiteUser => user

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  if (writeClient) {
    return writeClient.fetch(`*[_type == "siteUser" && email == $email][0]{ ${publicFields}, passwordHash }`, { email }, { cache: 'no-store' })
  }
  return [...mem.users.values()].find((u) => u.email === email) ?? null
}

export async function findUserById(id: string): Promise<SiteUser | null> {
  if (writeClient) {
    return writeClient.fetch(`*[_type == "siteUser" && _id == $id][0]{ ${publicFields} }`, { id }, { cache: 'no-store' })
  }
  const user = mem.users.get(id)
  return user ? strip(user) : null
}

export async function listUsers(): Promise<SiteUser[]> {
  if (writeClient) {
    return writeClient.fetch(`*[_type == "siteUser"] | order(createdAt desc){ ${publicFields} }`, {}, { cache: 'no-store' })
  }
  return [...mem.users.values()].map(strip).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

async function countUsers(): Promise<number> {
  if (writeClient) return writeClient.fetch(`count(*[_type == "siteUser"])`, {}, { cache: 'no-store' })
  return mem.users.size
}

/**
 * Bootstrap: the very first account becomes an administrator (as in Strapi),
 * and so does any email listed in ADMIN_EMAILS. Everyone else starts as "user".
 */
export async function createUser(name: string, email: string, password: string): Promise<SiteUser> {
  const role: Role = ADMIN_EMAILS.includes(email) || (await countUsers()) === 0 ? 'admin' : 'user'
  const doc = { name, email, passwordHash: hashPassword(password), role, blocked: false, createdAt: new Date().toISOString() }

  if (writeClient) {
    const created = await writeClient.create({ _id: `users.${randomUUID()}`, _type: 'siteUser', ...doc })
    return strip({ ...doc, _id: created._id })
  }
  const user = { ...doc, _id: `user-${randomBytes(6).toString('hex')}` }
  mem.users.set(user._id, user)
  return strip(user)
}

export async function updateUser(id: string, patch: Partial<Pick<SiteUser, 'role' | 'blocked'>>) {
  if (writeClient) {
    await writeClient.patch(id).set(patch).commit()
    return
  }
  const user = mem.users.get(id)
  if (user) Object.assign(user, patch)
}

/**
 * The signed-in user. Re-read from the store on every request, so blocking
 * or a role change applies immediately, without waiting for the cookie to expire.
 */
export async function getCurrentUser(): Promise<SiteUser | null> {
  const uid = readToken((await cookies()).get(COOKIE)?.value)
  return uid ? findUserById(uid) : null
}

export const usersStoredInSanity = Boolean(writeClient)
