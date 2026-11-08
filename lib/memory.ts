import 'server-only'

/**
 * In-memory store used when Sanity has no write token (local mode).
 * Lets registration, roles, blocking, topics and moderation work without
 * a CMS token. Data lives until the server process restarts.
 */
export interface MemUser {
  _id: string
  name: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  blocked: boolean
  createdAt: string
}

export interface MemComment {
  _id: string
  authorName: string
  text: string
  status: 'pending' | 'approved' | 'rejected'
  target: string
  userId: string
  createdAt: string
  aiFlagged?: boolean
}

export interface MemTopic {
  _id: string
  title: string
  slug: string
  body: string
  authorName: string
  userId: string
  related?: string
  createdAt: string
  hidden: boolean
}

type Store = { users: Map<string, MemUser>; comments: MemComment[]; topics: MemTopic[] }

// Kept on globalThis so the data survives hot reloads in `next dev`.
const g = globalThis as unknown as { __mem?: Store }
export const mem: Store = (g.__mem ??= { users: new Map(), comments: [], topics: [] })
