import 'server-only'
import { client, writeClient } from './sanity'
import { mem } from './memory'
import { describeTargets } from './data'
import type { Lang } from './types'

/** Comments, topics and their moderation — data for the admin panel and the account page. */
export type CommentStatus = 'pending' | 'approved' | 'rejected'

export interface CommunityComment {
  _id: string
  authorName: string
  text: string
  status: CommentStatus
  createdAt?: string
  aiFlagged?: boolean
  targetTitle?: string
  targetHref?: string
  editable: boolean
}

export interface CommunityTopic {
  _id: string
  title: string
  slug: string
  authorName?: string
  createdAt?: string
  hidden: boolean
  editable: boolean
}

const reader = writeClient ?? client
const noStore = { cache: 'no-store' as const }
const section: Record<string, string> = { component: 'components', project: 'projects', topic: 'forum' }

async function withTargets(list: (Omit<CommunityComment, 'targetTitle' | 'targetHref'> & { target: string })[], lang: Lang): Promise<CommunityComment[]> {
  const targets = await describeTargets([...new Set(list.map((c) => c.target))])
  return list.map(({ target, ...c }) => {
    const t = targets[target]
    return { ...c, targetTitle: t?.title ?? target, targetHref: t ? `/${lang}/${section[t.type] ?? 'forum'}/${t.slug}` : undefined }
  })
}

const commentFields = `_id, authorName, text, "status": coalesce(status, "pending"), createdAt, "aiFlagged": aiModeration.flagged, "target": target._ref`

async function queryComments(filter: string, params: Record<string, unknown>, limit: number) {
  const fromMem = mem.comments
    .filter((c) => (filter.includes('$uid') ? c.userId === params.uid : true) && (filter.includes('"pending"') ? c.status === 'pending' : true))
    .map((c) => ({ ...c, editable: true }))
  const fromSanity = reader
    ? (await reader.fetch<Omit<CommunityComment, 'editable'>[] & { target: string }[]>(
        `*[_type == "comment" && ${filter}] | order(createdAt desc)[0...${limit}]{ ${commentFields} }`,
        params,
        noStore,
      )).map((c) => ({ ...(c as CommunityComment & { target: string }), editable: Boolean(writeClient) }))
    : []
  return [...fromMem, ...fromSanity].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, limit)
}

export async function getModerationQueue(lang: Lang) {
  return withTargets(await queryComments('status == "pending"', {}, 100), lang)
}

export async function getRecentComments(lang: Lang) {
  return withTargets(await queryComments('defined(createdAt)', {}, 20), lang)
}

export async function getUserComments(uid: string, lang: Lang) {
  return withTargets(await queryComments('author._ref == $uid', { uid }, 50), lang)
}

export async function getAllTopics(): Promise<CommunityTopic[]> {
  const fromMem = mem.topics.map((t) => ({ _id: t._id, title: t.title, slug: t.slug, authorName: t.authorName, createdAt: t.createdAt, hidden: t.hidden, editable: true }))
  const fromSanity = reader
    ? (await reader.fetch<CommunityTopic[]>(
        `*[_type == "topic"] | order(createdAt desc)[0...100]{ _id, title, "slug": slug.current, authorName, createdAt, "hidden": coalesce(hidden, false) }`,
        {},
        noStore,
      )).map((t) => ({ ...t, editable: Boolean(writeClient) }))
    : []
  return [...fromMem, ...fromSanity].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export async function getUserTopics(uid: string): Promise<CommunityTopic[]> {
  const fromMem = mem.topics.filter((t) => t.userId === uid).map((t) => ({ _id: t._id, title: t.title, slug: t.slug, createdAt: t.createdAt, hidden: t.hidden, editable: true }))
  const fromSanity = writeClient
    ? await writeClient.fetch<CommunityTopic[]>(
        `*[_type == "topic" && author._ref == $uid] | order(createdAt desc){ _id, title, "slug": slug.current, createdAt, "hidden": coalesce(hidden, false), "editable": true }`,
        { uid },
        noStore,
      )
    : []
  return [...fromMem, ...fromSanity]
}

export async function setCommentStatus(id: string, status: CommentStatus) {
  const local = mem.comments.find((c) => c._id === id)
  if (local) {
    local.status = status
    return
  }
  if (writeClient) await writeClient.patch(id).set({ status }).commit()
}

export async function setTopicHidden(id: string, hidden: boolean) {
  const local = mem.topics.find((t) => t._id === id)
  if (local) {
    local.hidden = hidden
    return
  }
  if (writeClient) await writeClient.patch(id).set({ hidden }).commit()
}
