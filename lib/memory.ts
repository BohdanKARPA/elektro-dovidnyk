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

/** published — on the site; pending — waits for an admin; changes — returned to the author for fixes; rejected — final. */
export type SubmissionStatus = 'published' | 'pending' | 'changes' | 'rejected'
export interface AiReview {
  verdict: 'approve' | 'revise' | 'reject' | 'review'
  reason?: string
  flagged?: boolean
  categories?: string[]
  /** AI could not run; `reason` explains why (admin only). */
  failed?: boolean
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
  moderatorNote?: string
  moderatedAt?: string
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
  moderatorNote?: string
  moderatedAt?: string
}

/** One message in the private conversation between a user and the site administrators. */
export interface MemMessage {
  _id: string
  /** The user the conversation belongs to. */
  thread: string
  from: 'user' | 'admin'
  authorName: string
  text: string
  createdAt: string
  /** Optional submission the message is about. */
  about?: string
  readByUser: boolean
  readByAdmin: boolean
}

type Store = {
  users: Map<string, MemUser>
  comments: MemComment[]
  topics: MemTopic[]
  components: MemComponent[]
  projects: MemProject[]
  messages: MemMessage[]
}

// Kept on globalThis so the data survives hot reloads in `next dev`.
const g = globalThis as unknown as { __mem?: Store }
export const mem: Store = (g.__mem ??= { users: new Map(), comments: [], topics: [], components: [], projects: [], messages: [] })
mem.components ??= []
mem.projects ??= []
mem.messages ??= []
