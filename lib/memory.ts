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

export type SubmissionStatus = 'published' | 'pending' | 'rejected'
export interface AiReview {
  verdict: 'approve' | 'reject' | 'review'
  reason?: string
  flagged?: boolean
  categories?: string[]
  checkedAt: string
}
type Loc = { uk?: string; en?: string }

/** A component submitted by a user (local mode). Same shape as the CMS document, flattened. */
export interface MemComponent {
  _id: string
  name: string
  slug: string
  manufacturer?: string
  categoryId: string
  summary: Loc
  description: Loc
  specs: { _key: string; label: string; value: string }[]
  package?: string
  priceUah?: number
  datasheetUrl?: string
  lcscPart?: string
  tags?: string[]
  status: SubmissionStatus
  userId: string
  authorName: string
  createdAt: string
  aiReview?: AiReview
}

export interface MemProject {
  _id: string
  title: Loc
  slug: string
  summary: Loc
  difficulty: 'easy' | 'medium' | 'hard'
  durationHours?: number
  componentIds: string[]
  steps: { _key: string; title: Loc; text: Loc }[]
  status: SubmissionStatus
  userId: string
  authorName: string
  createdAt: string
  aiReview?: AiReview
}

type Store = {
  users: Map<string, MemUser>
  comments: MemComment[]
  topics: MemTopic[]
  components: MemComponent[]
  projects: MemProject[]
}

// Kept on globalThis so the data survives hot reloads in `next dev`.
const g = globalThis as unknown as { __mem?: Store }
export const mem: Store = (g.__mem ??= { users: new Map(), comments: [], topics: [], components: [], projects: [] })
mem.components ??= []
mem.projects ??= []
