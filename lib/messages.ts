import 'server-only'
import { randomUUID } from 'node:crypto'
import { findUserById } from './auth'
import { mem, type MemMessage } from './memory'
import { writeClient } from './sanity'

/**
 * Private conversations between each user and the administrators.
 * One conversation ("thread") per user. In Sanity the messages use
 * "messages.*" ids, which are private: readable only with the server token.
 * Without a token they live in server memory (local mode).
 */

export interface ChatMessage {
  _id: string
  from: 'user' | 'admin'
  authorName: string
  text: string
  createdAt: string
  about?: { id: string; title: string; kind: 'component' | 'project'; slug?: string; status?: string } | null
}

export interface ThreadSummary {
  userId: string
  userName: string
  lastText: string
  lastFrom: 'user' | 'admin'
  lastAt: string
  unread: number
}

const noStore = { cache: 'no-store' as const }
const aboutProjection = `"about": about->{ "id": _id, "title": coalesce(name, title.uk), "kind": _type, "slug": slug.current, "status": coalesce(status, "published") }`

function aboutFromMemory(id?: string): ChatMessage['about'] {
  if (!id) return null
  const c = mem.components.find((x) => x._id === id)
  if (c) return { id, title: c.name, kind: 'component', slug: c.slug, status: c.status }
  const p = mem.projects.find((x) => x._id === id)
  if (p) return { id, title: p.title.uk ?? p.slug, kind: 'project', slug: p.slug, status: p.status }
  return null
}

const fromMem = (m: MemMessage): ChatMessage => ({ _id: m._id, from: m.from, authorName: m.authorName, text: m.text, createdAt: m.createdAt, about: aboutFromMemory(m.about) })

/** Messages of one conversation, oldest first. Marks the other side's messages as read for `viewer`. */
export async function listThread(userId: string, viewer: 'user' | 'admin'): Promise<ChatMessage[]> {
  const other = viewer === 'user' ? 'admin' : 'user'
  const readField = viewer === 'user' ? 'readByUser' : 'readByAdmin'

  const local = mem.messages.filter((m) => m.thread === userId)
  for (const m of local) if (m.from === other) m[readField] = true

  let remote: ChatMessage[] = []
  if (writeClient) {
    remote = await writeClient.fetch<ChatMessage[]>(
      `*[_type == "message" && thread._ref == $uid] | order(createdAt asc)[0...300]{ _id, from, authorName, text, createdAt, ${aboutProjection} }`,
      { uid: userId },
      noStore,
    )
    const unread = await writeClient.fetch<string[]>(`*[_type == "message" && thread._ref == $uid && from == $other && ${readField} != true]._id`, { uid: userId, other }, noStore)
    if (unread.length) {
      const tx = writeClient.transaction()
      for (const id of unread) tx.patch(id, (p) => p.set({ [readField]: true }))
      await tx.commit()
    }
  }
  // A mem message may reference a CMS submission and vice versa; fill gaps from memory.
  return [...remote, ...local.map(fromMem)]
    .map((m) => (m.about ? m : { ...m, about: m.about ?? null }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function sendMessage(msg: { thread: string; from: 'user' | 'admin'; authorName: string; text: string; about?: string }): Promise<void> {
  const createdAt = new Date().toISOString()
  const readByUser = msg.from === 'user'
  const readByAdmin = msg.from === 'admin'
  if (writeClient) {
    await writeClient.create({
      _id: `messages.${randomUUID()}`,
      _type: 'message',
      thread: { _type: 'reference', _ref: msg.thread, _weak: true },
      from: msg.from,
      authorName: msg.authorName,
      text: msg.text,
      ...(msg.about && { about: { _type: 'reference', _ref: msg.about, _weak: true } }),
      readByUser,
      readByAdmin,
      createdAt,
    })
    return
  }
  mem.messages.push({ _id: `m-${randomUUID()}`, thread: msg.thread, from: msg.from, authorName: msg.authorName, text: msg.text, createdAt, about: msg.about, readByUser, readByAdmin })
}

/** Unread messages: for a user — replies from admins; for admins — messages from all users. */
export async function unreadCount(viewer: { _id: string; role: 'user' | 'admin' }): Promise<number> {
  if (viewer.role === 'admin') {
    const local = mem.messages.filter((m) => m.from === 'user' && !m.readByAdmin).length
    const remote = writeClient ? await writeClient.fetch<number>('count(*[_type == "message" && from == "user" && readByAdmin != true])', {}, noStore) : 0
    return local + remote
  }
  const local = mem.messages.filter((m) => m.thread === viewer._id && m.from === 'admin' && !m.readByUser).length
  const remote = writeClient ? await writeClient.fetch<number>('count(*[_type == "message" && thread._ref == $uid && from == "admin" && readByUser != true])', { uid: viewer._id }, noStore) : 0
  return local + remote
}

/** All conversations for the admin inbox, the ones with unread messages first. */
export async function listThreads(): Promise<ThreadSummary[]> {
  type Row = { thread: string; from: 'user' | 'admin'; authorName: string; text: string; createdAt: string; readByAdmin?: boolean }
  const rows: Row[] = [
    ...mem.messages.map((m) => ({ thread: m.thread, from: m.from, authorName: m.authorName, text: m.text, createdAt: m.createdAt, readByAdmin: m.readByAdmin })),
    ...(writeClient
      ? await writeClient.fetch<Row[]>('*[_type == "message"] | order(createdAt desc)[0...1000]{ "thread": thread._ref, from, authorName, text, createdAt, readByAdmin }', {}, noStore)
      : []),
  ]
  const byThread = new Map<string, Row[]>()
  for (const r of rows) byThread.set(r.thread, [...(byThread.get(r.thread) ?? []), r])

  const out: ThreadSummary[] = []
  for (const [userId, list] of byThread) {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const last = list[0]
    const fromUser = list.find((r) => r.from === 'user')
    const userName = fromUser?.authorName ?? (await findUserById(userId))?.name ?? userId
    out.push({ userId, userName, lastText: last.text, lastFrom: last.from, lastAt: last.createdAt, unread: list.filter((r) => r.from === 'user' && !r.readByAdmin).length })
  }
  return out.sort((a, b) => b.unread - a.unread || b.lastAt.localeCompare(a.lastAt))
}
