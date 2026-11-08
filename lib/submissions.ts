import 'server-only'
import { randomBytes } from 'node:crypto'
import { translateToEnglish, type SubmissionReview } from './ai'
import { mem, type AiReview, type MemComponent, type MemProject, type SubmissionStatus } from './memory'
import { client, writeClient } from './sanity'
import { slugify } from './slug'

/**
 * Components and projects submitted by site users.
 * With a Sanity write token they are stored as regular CMS documents with a
 * `status`; without one they live in server memory (local mode), like topics.
 */

export interface ComponentInput {
  name: string
  manufacturer?: string
  categoryId: string
  package?: string
  priceUah?: number
  summary: string
  description: string
  specs: { label: string; value: string }[]
  datasheetUrl?: string
  lcscPart?: string
  tags: string[]
}

export interface ProjectInput {
  title: string
  summary: string
  difficulty: 'easy' | 'medium' | 'hard'
  durationHours?: number
  componentIds: string[]
  steps: { title: string; text: string }[]
}

export interface SubmissionRow {
  _id: string
  kind: 'component' | 'project'
  title: string
  slug: string
  status: SubmissionStatus
  authorName?: string
  userId?: string
  createdAt?: string
  aiReview?: AiReview
  /** Reason or advice from the moderator who decided (shown to the author). */
  moderatorNote?: string
  moderatedAt?: string
  /** false for editorial documents (made in Sanity Studio), true for submissions via the site. */
  submitted: boolean
  editable: boolean
}

const key = () => randomBytes(4).toString('hex')
const reader = writeClient ?? client
const noStore = { cache: 'no-store' as const }

/** Map an AI verdict (or its absence) to the status a new submission gets. */
export function statusFromReview(review: SubmissionReview | null, isAdmin: boolean): SubmissionStatus {
  if (isAdmin) return 'published'
  if (!review) return 'pending' // AI unavailable: a human decides
  return review.verdict === 'approve' ? 'published' : review.verdict === 'revise' ? 'changes' : review.verdict === 'reject' ? 'rejected' : 'pending'
}

function toAiReview(review: SubmissionReview | null): AiReview | undefined {
  if (!review) return undefined
  return { verdict: review.verdict, reason: review.reason, flagged: review.flagged, categories: review.categories, ...(review.failed && { failed: true }), checkedAt: new Date().toISOString() }
}

async function slugTaken(type: 'component' | 'project', slug: string): Promise<boolean> {
  const local = type === 'component' ? mem.components.some((c) => c.slug === slug) : mem.projects.some((p) => p.slug === slug)
  if (local) return true
  if (!reader) return false
  return Boolean(await reader.fetch<number>('count(*[_type == $type && slug.current == $slug])', { type, slug }, noStore))
}

async function uniqueSlug(type: 'component' | 'project', base: string, demoSlugs: string[]): Promise<string> {
  const root = slugify(base) || type
  if (!demoSlugs.includes(root) && !(await slugTaken(type, root))) return root
  for (let i = 0; i < 5; i++) {
    const s = `${root}-${randomBytes(2).toString('hex')}`
    if (!(await slugTaken(type, s))) return s
  }
  return `${root}-${randomBytes(4).toString('hex')}`
}

/* ------------------------------- create ------------------------------- */

export async function createComponent(
  input: ComponentInput,
  user: { _id: string; name: string },
  status: SubmissionStatus,
  review: SubmissionReview | null,
  existingSlugs: string[],
): Promise<{ id: string; slug: string }> {
  const slug = await uniqueSlug('component', input.name, [...existingSlugs, 'new'])
  const specs = input.specs.map((s) => ({ _key: key(), label: s.label, value: s.value }))
  const createdAt = new Date().toISOString()
  const aiReview = toAiReview(review)

  if (writeClient) {
    const doc = await writeClient.create({
      _type: 'component',
      name: input.name,
      slug: { _type: 'slug', current: slug },
      manufacturer: input.manufacturer,
      category: { _type: 'reference', _ref: input.categoryId },
      package: input.package,
      priceUah: input.priceUah,
      summary: { _type: 'localeString', uk: input.summary },
      description: { _type: 'localeText', uk: input.description },
      specs,
      datasheetUrl: input.datasheetUrl,
      lcscPart: input.lcscPart,
      tags: input.tags,
      aiTranslate: true,
      status,
      submittedBy: { _type: 'reference', _ref: user._id, _weak: true },
      submittedByName: user.name,
      submittedAt: createdAt,
      ...(aiReview && { aiReview }),
    })
    if (status === 'published') await translateSubmission(doc._id)
    return { id: doc._id, slug }
  }

  const c: MemComponent = {
    _id: `c-${key()}${key()}`,
    name: input.name,
    slug,
    manufacturer: input.manufacturer,
    categoryId: input.categoryId,
    summary: { uk: input.summary },
    description: { uk: input.description },
    specs,
    package: input.package,
    priceUah: input.priceUah,
    datasheetUrl: input.datasheetUrl,
    lcscPart: input.lcscPart,
    tags: input.tags,
    status,
    userId: user._id,
    authorName: user.name,
    createdAt,
    aiReview,
  }
  mem.components.push(c)
  if (status === 'published') await translateSubmission(c._id)
  return { id: c._id, slug }
}

export async function createProject(
  input: ProjectInput,
  user: { _id: string; name: string },
  status: SubmissionStatus,
  review: SubmissionReview | null,
): Promise<{ id: string; slug: string }> {
  const slug = await uniqueSlug('project', input.title, ['new'])
  const steps = input.steps.map((s) => ({ _key: key(), title: { uk: s.title }, text: { uk: s.text } }))
  const createdAt = new Date().toISOString()
  const aiReview = toAiReview(review)

  if (writeClient) {
    const doc = await writeClient.create({
      _type: 'project',
      title: { _type: 'localeString', uk: input.title },
      slug: { _type: 'slug', current: slug },
      summary: { _type: 'localeString', uk: input.summary },
      difficulty: input.difficulty,
      durationHours: input.durationHours,
      publishedAt: createdAt,
      components: input.componentIds.map((id) => ({ _type: 'reference', _ref: id, _key: key() })),
      steps: steps.map((s) => ({ _type: 'step', _key: s._key, title: { _type: 'localeString', ...s.title }, text: { _type: 'localeText', ...s.text } })),
      aiTranslate: true,
      status,
      submittedBy: { _type: 'reference', _ref: user._id, _weak: true },
      submittedByName: user.name,
      submittedAt: createdAt,
      ...(aiReview && { aiReview }),
    })
    if (status === 'published') await translateSubmission(doc._id)
    return { id: doc._id, slug }
  }

  const p: MemProject = {
    _id: `p-${key()}${key()}`,
    title: { uk: input.title },
    slug,
    summary: { uk: input.summary },
    difficulty: input.difficulty,
    durationHours: input.durationHours,
    componentIds: input.componentIds,
    steps,
    status,
    userId: user._id,
    authorName: user.name,
    createdAt,
    aiReview,
  }
  mem.projects.push(p)
  if (status === 'published') await translateSubmission(p._id)
  return { id: p._id, slug }
}

/* --------------------------- edit and resubmit -------------------------- */

export type EditableSubmission =
  | { kind: 'component'; id: string; status: SubmissionStatus; note?: string; aiReason?: string; input: ComponentInput }
  | { kind: 'project'; id: string; status: SubmissionStatus; note?: string; aiReason?: string; input: ProjectInput }

/** A submission its author may fix: only their own, and only while it is returned for changes. */
export async function getOwnSubmission(id: string, uid: string): Promise<EditableSubmission | null> {
  const c = mem.components.find((x) => x._id === id && x.userId === uid)
  if (c) {
    return {
      kind: 'component', id, status: c.status, note: c.moderatorNote, aiReason: c.aiReview?.failed ? undefined : c.aiReview?.reason,
      input: { name: c.name, manufacturer: c.manufacturer, categoryId: c.categoryId, package: c.package, priceUah: c.priceUah, summary: c.summary.uk ?? '', description: c.description.uk ?? '', specs: c.specs.map(({ label, value }) => ({ label, value })), datasheetUrl: c.datasheetUrl, lcscPart: c.lcscPart, tags: c.tags ?? [] },
    }
  }
  const p = mem.projects.find((x) => x._id === id && x.userId === uid)
  if (p) {
    return {
      kind: 'project', id, status: p.status, note: p.moderatorNote, aiReason: p.aiReview?.failed ? undefined : p.aiReview?.reason,
      input: { title: p.title.uk ?? '', summary: p.summary.uk ?? '', difficulty: p.difficulty, durationHours: p.durationHours, componentIds: p.componentIds, steps: p.steps.map((st) => ({ title: st.title.uk ?? '', text: st.text.uk ?? '' })) },
    }
  }
  if (!writeClient) return null
  const d = await writeClient.fetch<Record<string, unknown> | null>(
    `*[_id == $id && submittedBy._ref == $uid][0]{
      _type, "status": coalesce(status, "published"), moderatorNote, aiReview,
      name, manufacturer, "categoryId": category._ref, package, priceUah, "summary": summary.uk, "description": description.uk,
      "specs": specs[]{ label, value }, datasheetUrl, lcscPart, tags,
      "title": title.uk, difficulty, durationHours, "componentIds": components[]._ref, "steps": steps[]{ "title": title.uk, "text": text.uk }
    }`,
    { id, uid },
    noStore,
  )
  if (!d) return null
  const review = d.aiReview as AiReview | undefined
  const base = { id, status: d.status as SubmissionStatus, note: d.moderatorNote as string | undefined, aiReason: review?.failed ? undefined : review?.reason }
  if (d._type === 'component') {
    return {
      kind: 'component', ...base,
      input: { name: String(d.name ?? ''), manufacturer: d.manufacturer as string | undefined, categoryId: String(d.categoryId ?? ''), package: d.package as string | undefined, priceUah: d.priceUah as number | undefined, summary: String(d.summary ?? ''), description: String(d.description ?? ''), specs: (d.specs as { label: string; value: string }[]) ?? [], datasheetUrl: d.datasheetUrl as string | undefined, lcscPart: d.lcscPart as string | undefined, tags: (d.tags as string[]) ?? [] },
    }
  }
  return {
    kind: 'project', ...base,
    input: { title: String(d.title ?? ''), summary: String(d.summary ?? ''), difficulty: (d.difficulty as ProjectInput['difficulty']) ?? 'easy', durationHours: d.durationHours as number | undefined, componentIds: (d.componentIds as string[]) ?? [], steps: (d.steps as { title: string; text: string }[]) ?? [] },
  }
}

/** Save the author's fixes; the new AI review decides the new status. */
export async function updateComponent(id: string, input: ComponentInput, status: SubmissionStatus, review: SubmissionReview | null): Promise<string> {
  const aiReview = toAiReview(review)
  const specs = input.specs.map((sp) => ({ _key: key(), label: sp.label, value: sp.value }))
  const c = mem.components.find((x) => x._id === id)
  if (c) {
    Object.assign(c, { ...input, categoryId: input.categoryId, summary: { uk: input.summary }, description: { uk: input.description }, specs, status, aiReview, moderatorNote: undefined, moderatedAt: undefined })
    if (status === 'published') await translateSubmission(id)
    return c.slug
  }
  if (!writeClient) throw new Error('not found')
  await writeClient
    .patch(id)
    .set({
      name: input.name,
      manufacturer: input.manufacturer,
      category: { _type: 'reference', _ref: input.categoryId },
      package: input.package,
      priceUah: input.priceUah,
      summary: { _type: 'localeString', uk: input.summary },
      description: { _type: 'localeText', uk: input.description },
      specs,
      datasheetUrl: input.datasheetUrl,
      lcscPart: input.lcscPart,
      tags: input.tags,
      status,
      resubmittedAt: new Date().toISOString(),
      ...(aiReview && { aiReview }),
    })
    .unset(['moderatorNote', 'moderatedAt'])
    .commit()
  if (status === 'published') await translateSubmission(id)
  return (await writeClient.fetch<string>('*[_id == $id][0].slug.current', { id }, noStore)) ?? ''
}

export async function updateProject(id: string, input: ProjectInput, status: SubmissionStatus, review: SubmissionReview | null): Promise<string> {
  const aiReview = toAiReview(review)
  const steps = input.steps.map((st) => ({ _key: key(), title: { uk: st.title }, text: { uk: st.text } }))
  const p = mem.projects.find((x) => x._id === id)
  if (p) {
    Object.assign(p, { title: { uk: input.title }, summary: { uk: input.summary }, difficulty: input.difficulty, durationHours: input.durationHours, componentIds: input.componentIds, steps, status, aiReview, moderatorNote: undefined, moderatedAt: undefined })
    if (status === 'published') await translateSubmission(id)
    return p.slug
  }
  if (!writeClient) throw new Error('not found')
  await writeClient
    .patch(id)
    .set({
      title: { _type: 'localeString', uk: input.title },
      summary: { _type: 'localeString', uk: input.summary },
      difficulty: input.difficulty,
      durationHours: input.durationHours,
      components: input.componentIds.map((cid) => ({ _type: 'reference', _ref: cid, _key: key() })),
      steps: steps.map((st) => ({ _type: 'step', _key: st._key, title: { _type: 'localeString', ...st.title }, text: { _type: 'localeText', ...st.text } })),
      status,
      resubmittedAt: new Date().toISOString(),
      ...(aiReview && { aiReview }),
    })
    .unset(['moderatorNote', 'moderatedAt'])
    .commit()
  if (status === 'published') await translateSubmission(id)
  return (await writeClient.fetch<string>('*[_id == $id][0].slug.current', { id }, noStore)) ?? ''
}

/* ------------------------------ moderation ----------------------------- */

const sanityRow = `_id, "kind": _type, "title": coalesce(name, title.uk), "slug": slug.current, "status": coalesce(status, "published"),
  "authorName": submittedByName, "userId": submittedBy._ref, "createdAt": coalesce(submittedAt, publishedAt), aiReview, moderatorNote, moderatedAt, "submitted": defined(submittedBy)`

function memRows(filter: (r: { status: SubmissionStatus; userId: string }) => boolean): SubmissionRow[] {
  return [
    ...mem.components.filter(filter).map((c): SubmissionRow => ({ _id: c._id, kind: 'component', title: c.name, slug: c.slug, status: c.status, authorName: c.authorName, userId: c.userId, createdAt: c.createdAt, aiReview: c.aiReview, moderatorNote: c.moderatorNote, moderatedAt: c.moderatedAt, submitted: true, editable: true })),
    ...mem.projects.filter(filter).map((p): SubmissionRow => ({ _id: p._id, kind: 'project', title: p.title.uk ?? p.slug, slug: p.slug, status: p.status, authorName: p.authorName, userId: p.userId, createdAt: p.createdAt, aiReview: p.aiReview, moderatorNote: p.moderatorNote, moderatedAt: p.moderatedAt, submitted: true, editable: true })),
  ]
}

const byDate = (a: SubmissionRow, b: SubmissionRow) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/** All user submissions for the admin panel, newest first (pending first). */
export async function listSubmissions(): Promise<SubmissionRow[]> {
  const fromSanity = reader
    ? (await reader.fetch<SubmissionRow[]>(`*[_type in ["component", "project"] && defined(submittedBy)] | order(submittedAt desc)[0...100]{ ${sanityRow} }`, {}, noStore)).map((r) => ({ ...r, editable: Boolean(writeClient) }))
    : []
  const order: Record<SubmissionStatus, number> = { pending: 0, changes: 1, rejected: 2, published: 3 }
  return [...memRows(() => true), ...fromSanity].sort((a, b) => order[a.status] - order[b.status] || byDate(a, b))
}

export async function listUserSubmissions(uid: string): Promise<SubmissionRow[]> {
  // Submissions made through the site, plus projects whose editorial author profile is linked to this account.
  const fromSanity = writeClient
    ? (
        await writeClient.fetch<SubmissionRow[]>(
          `*[(_type in ["component", "project"] && submittedBy._ref == $uid) || (_type == "project" && author->user._ref == $uid)]
            | order(coalesce(submittedAt, publishedAt) desc){ ${sanityRow} }`,
          { uid },
          noStore,
        )
      ).map((r) => ({ ...r, editable: true }))
    : []
  return [...memRows((r) => r.userId === uid), ...fromSanity].sort(byDate)
}

/**
 * Publish or reject a submission. Returns who submitted it and its title, so
 * the caller can tell the author (chat message).
 */
export async function setSubmissionStatus(
  id: string,
  status: SubmissionStatus,
  note?: string,
): Promise<{ userId?: string; title: string; kind: 'component' | 'project'; slug: string } | null> {
  const moderatedAt = new Date().toISOString()
  const c = mem.components.find((x) => x._id === id)
  const p = mem.projects.find((x) => x._id === id)
  let meta: { userId?: string; title: string; kind: 'component' | 'project'; slug: string } | null = null
  if (c) {
    Object.assign(c, { status, moderatorNote: note, moderatedAt })
    meta = { userId: c.userId, title: c.name, kind: 'component', slug: c.slug }
  } else if (p) {
    Object.assign(p, { status, moderatorNote: note, moderatedAt })
    meta = { userId: p.userId, title: p.title.uk ?? p.slug, kind: 'project', slug: p.slug }
  } else if (writeClient) {
    const patch = writeClient.patch(id).set({ status, moderatedAt })
    await (note ? patch.set({ moderatorNote: note }) : patch.unset(['moderatorNote'])).commit()
    meta = await writeClient.fetch('*[_id == $id][0]{ "userId": submittedBy._ref, "title": coalesce(name, title.uk), "kind": _type, "slug": slug.current }', { id }, noStore)
  }
  if (status === 'published') await translateSubmission(id)
  return meta
}

/* ------------------------------ translation ---------------------------- */

/** Fill the English fields of a published submission (best effort; skipped without AI). */
export async function translateSubmission(id: string): Promise<void> {
  try {
    const c = mem.components.find((x) => x._id === id)
    const p = mem.projects.find((x) => x._id === id)
    if (c) {
      const en = await translateToEnglish({ summary: c.summary.uk ?? '', description: c.description.uk ?? '' })
      if (en.summary) c.summary.en = en.summary
      if (en.description) c.description.en = en.description
      return
    }
    if (p) {
      const src: Record<string, string> = { title: p.title.uk ?? '', summary: p.summary.uk ?? '' }
      p.steps.forEach((s, i) => {
        src[`s${i}t`] = s.title.uk ?? ''
        src[`s${i}x`] = s.text.uk ?? ''
      })
      const en = await translateToEnglish(src)
      if (en.title) p.title.en = en.title
      if (en.summary) p.summary.en = en.summary
      p.steps.forEach((s, i) => {
        if (en[`s${i}t`]) s.title.en = en[`s${i}t`]
        if (en[`s${i}x`]) s.text.en = en[`s${i}x`]
      })
      return
    }
    if (!writeClient) return
    const doc = await writeClient.fetch<{
      _type: string
      summary?: { uk?: string; en?: string }
      description?: { uk?: string; en?: string }
      title?: { uk?: string; en?: string }
      steps?: { _key: string; title?: { uk?: string; en?: string }; text?: { uk?: string; en?: string } }[]
    } | null>('*[_id == $id][0]{ _type, summary, description, title, steps }', { id }, noStore)
    if (!doc) return
    const src: Record<string, string> = {}
    if (doc.summary?.uk && !doc.summary.en) src.summary = doc.summary.uk
    if (doc.description?.uk && !doc.description.en) src.description = doc.description.uk
    if (doc.title?.uk && !doc.title.en) src.title = doc.title.uk
    doc.steps?.forEach((s, i) => {
      if (s.title?.uk && !s.title.en) src[`s${i}t`] = s.title.uk
      if (s.text?.uk && !s.text.en) src[`s${i}x`] = s.text.uk
    })
    const en = await translateToEnglish(src)
    const set: Record<string, string> = {}
    if (en.summary) set['summary.en'] = en.summary
    if (en.description) set['description.en'] = en.description
    if (en.title) set['title.en'] = en.title
    doc.steps?.forEach((s, i) => {
      if (en[`s${i}t`]) set[`steps[_key=="${s._key}"].title.en`] = en[`s${i}t`]
      if (en[`s${i}x`]) set[`steps[_key=="${s._key}"].text.en`] = en[`s${i}x`]
    })
    if (Object.keys(set).length) await writeClient.patch(id).set(set).commit()
  } catch (err) {
    console.error('[submissions] translation failed', err)
  }
}
