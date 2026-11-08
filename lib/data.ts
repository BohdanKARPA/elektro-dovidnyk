import 'server-only'
import { groq } from 'next-sanity'
import seed from '@/data/seed.json'
import { isSanityConfigured } from '@/sanity/env'
import { sanityFetch } from './sanity'
import type { Author, Category, CommentDoc, ComponentDoc, ProjectDoc, Topic } from './types'
import { mem, type MemComponent, type MemProject } from './memory'

/* ------------------------------------------------------------------ *
 *  GROQ queries. All user-supplied values are passed as $params,     *
 *  never concatenated into the query string (no GROQ injection).     *
 * ------------------------------------------------------------------ */

/** Documents shown on the site: editor-made ones (no status) and published user submissions. */
const PUB = groq`(!defined(status) || status == "published")`

const categoryFields = groq`_id, title, "slug": slug.current, icon, description`
const componentCard = groq`
  _id, name, "slug": slug.current, manufacturer, summary, image, package, priceUah, tags,
  "category": category->{ ${categoryFields} }`
const componentFull = groq`${componentCard}, description, seoDescription, specs, datasheetUrl, lcscPart`
const projectCard = groq`
  _id, title, "slug": slug.current, summary, difficulty, durationHours, publishedAt, cover, submittedByName,
  "author": author->{ _id, name, "slug": slug.current, role }`

// Lists also carry a light parts list: project covers are drawn from it.
const projectListItem = groq`${projectCard}, "components": components[]->{ _id, name, "slug": slug.current, manufacturer, package }`

const Q = {
  categories: groq`*[_type == "category"] | order(order asc) {
    ${categoryFields}, "count": count(*[_type == "component" && references(^._id) && ${PUB}])
  }`,
  components: groq`*[_type == "component" && ${PUB}] | order(name asc) { ${componentCard} }`,
  component: groq`*[_type == "component" && slug.current == $slug && ${PUB}][0] { ${componentFull} }`,
  componentSlugs: groq`*[_type == "component" && defined(slug.current) && ${PUB}].slug.current`,
  projectsUsing: groq`*[_type == "project" && references($id) && ${PUB}] | order(publishedAt desc) { ${projectListItem} }`,
  projects: groq`*[_type == "project" && ${PUB}] | order(publishedAt desc) { ${projectListItem} }`,
  project: groq`*[_type == "project" && slug.current == $slug && ${PUB}][0] {
    ${projectCard}, seoDescription, steps, "components": components[]->{ ${componentCard} }
  }`,
  projectSlugs: groq`*[_type == "project" && defined(slug.current) && ${PUB}].slug.current`,
  author: groq`*[_type == "author" && slug.current == $slug][0] { _id, name, "slug": slug.current, role, bio }`,
  topics: groq`*[_type == "topic" && hidden != true] | order(pinned desc, createdAt desc) {
    _id, title, "slug": slug.current, authorName, body, pinned, createdAt,
    "commentCount": count(*[_type == "comment" && status == "approved" && references(^._id)])
  }`,
  topic: groq`*[_type == "topic" && hidden != true && slug.current == $slug][0] {
    _id, title, "slug": slug.current, authorName, body, pinned, createdAt,
    "related": related->{ ${componentCard} }
  }`,
  topicSlugs: groq`*[_type == "topic" && defined(slug.current)].slug.current`,
  comments: groq`*[_type == "comment" && status == "approved" && target._ref == $id] | order(createdAt asc) {
    _id, authorName, text, createdAt
  }`,
  stats: groq`{
    "components": count(*[_type == "component" && ${PUB}]),
    "projects": count(*[_type == "project" && ${PUB}]),
    "topics": count(*[_type == "topic" && hidden != true])
  }`,
}

/* ------------------------------------------------------------------ *
 *  Demo mode: the same shapes, resolved from data/seed.json, so the   *
 *  site builds and runs before a Sanity project is connected.         *
 * ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>
const docs = seed as Raw[]
const byId = new Map(docs.map((d) => [d._id, d]))
const ofType = (type: string) => docs.filter((d) => d._type === type)
const slugOf = (d: Raw) => d.slug?.current as string

const demo = {
  category: (d: Raw): Category => ({ _id: d._id, title: d.title, slug: slugOf(d), icon: d.icon, description: d.description }),
  component: (d: Raw): ComponentDoc => ({
    ...(d as ComponentDoc),
    slug: slugOf(d),
    category: d.category ? demo.category(byId.get(d.category._ref)!) : null,
  }),
  project: (d: Raw): ProjectDoc => {
    const a = d.author ? byId.get(d.author._ref) : null
    return {
      ...(d as ProjectDoc),
      slug: slugOf(d),
      author: a ? { _id: a._id, name: a.name, slug: slugOf(a), role: a.role } : null,
      components: (d.components ?? []).map((r: Raw) => demo.component(byId.get(r._ref)!)),
    }
  },
  approvedFor: (id: string) =>
    ofType('comment').filter((c) => c.status === 'approved' && c.target?._ref === id),
}

/* ---------- user submissions kept in memory (no CMS write token) ---------- */

const memPublished = {
  components: () => mem.components.filter((c) => c.status === 'published'),
  projects: () => mem.projects.filter((p) => p.status === 'published'),
}

function fromMemComponent(c: MemComponent, cats: Category[]): ComponentDoc {
  return {
    _id: c._id,
    name: c.name,
    slug: c.slug,
    manufacturer: c.manufacturer,
    category: cats.find((k) => k._id === c.categoryId) ?? null,
    summary: c.summary,
    description: c.description,
    specs: c.specs,
    package: c.package,
    priceUah: c.priceUah,
    datasheetUrl: c.datasheetUrl,
    lcscPart: c.lcscPart,
    tags: c.tags,
    image: null,
  }
}

function fromMemProject(p: MemProject, components: ComponentDoc[]): ProjectDoc {
  return {
    _id: p._id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    difficulty: p.difficulty,
    durationHours: p.durationHours,
    publishedAt: p.createdAt,
    author: null,
    submittedByName: p.authorName,
    cover: null,
    components: p.componentIds.map((id) => components.find((c) => c._id === id)).filter((c): c is ComponentDoc => Boolean(c)),
    steps: p.steps,
  }
}

/* ------------------------------ API -------------------------------- */

async function baseCategories(): Promise<Category[]> {
  if (isSanityConfigured) return sanityFetch(Q.categories, {}, ['category', 'component'])
  return ofType('category')
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ ...demo.category(c), count: ofType('component').filter((x) => x.category?._ref === c._id).length }))
}

export async function getCategories(): Promise<Category[]> {
  const cats = await baseCategories()
  const extra = memPublished.components()
  return extra.length ? cats.map((c) => ({ ...c, count: (c.count ?? 0) + extra.filter((x) => x.categoryId === c._id).length })) : cats
}

export async function getComponents(): Promise<ComponentDoc[]> {
  const base: ComponentDoc[] = isSanityConfigured
    ? await sanityFetch(Q.components, {}, ['component', 'category'])
    : ofType('component').map(demo.component)
  const extra = memPublished.components()
  const cats = extra.length ? await baseCategories() : []
  return [...base, ...extra.map((c) => fromMemComponent(c, cats))].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getComponent(slug: string): Promise<ComponentDoc | null> {
  const m = memPublished.components().find((c) => c.slug === slug)
  if (m) return fromMemComponent(m, await baseCategories())
  if (isSanityConfigured) return sanityFetch(Q.component, { slug }, ['component', 'category'])
  const d = ofType('component').find((c) => slugOf(c) === slug)
  return d ? demo.component(d) : null
}

export async function getProjectsUsing(componentId: string): Promise<ProjectDoc[]> {
  const base: ProjectDoc[] = isSanityConfigured
    ? await sanityFetch(Q.projectsUsing, { id: componentId }, ['project'])
    : ofType('project')
        .filter((p) => (p.components ?? []).some((r: Raw) => r._ref === componentId))
        .map(demo.project)
  const extra = memPublished.projects().filter((p) => p.componentIds.includes(componentId))
  if (!extra.length) return base
  const comps = await getComponents()
  return [...base, ...extra.map((p) => fromMemProject(p, comps))]
}

export async function getProjects(): Promise<ProjectDoc[]> {
  const base: ProjectDoc[] = isSanityConfigured ? await sanityFetch(Q.projects, {}, ['project', 'author']) : ofType('project').map(demo.project)
  const extra = memPublished.projects()
  const comps = extra.length ? await getComponents() : []
  return [...base, ...extra.map((p) => fromMemProject(p, comps))].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
}

export async function getProject(slug: string): Promise<ProjectDoc | null> {
  const m = memPublished.projects().find((p) => p.slug === slug)
  if (m) return fromMemProject(m, await getComponents())
  if (isSanityConfigured) return sanityFetch(Q.project, { slug }, ['project', 'component', 'author'])
  const d = ofType('project').find((p) => slugOf(p) === slug)
  return d ? demo.project(d) : null
}

export async function getAuthor(slug: string): Promise<Author | null> {
  if (isSanityConfigured) return sanityFetch(Q.author, { slug }, ['author'])
  const a = ofType('author').find((d) => slugOf(d) === slug)
  return a ? { _id: a._id, name: a.name, slug: slugOf(a), role: a.role, bio: a.bio } : null
}

const approvedLocal = (id: string) => mem.comments.filter((c) => c.target === id && c.status === 'approved').length
const sortTopics = (list: Topic[]) =>
  list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

export async function getTopics(): Promise<Topic[]> {
  const local: Topic[] = mem.topics
    .filter((t) => !t.hidden)
    .map((t) => ({ _id: t._id, title: t.title, slug: t.slug, authorName: t.authorName, body: t.body, pinned: false, createdAt: t.createdAt, related: null, commentCount: approvedLocal(t._id) }))
  const base: Topic[] = isSanityConfigured
    ? await sanityFetch<Topic[]>(Q.topics, {}, ['topic', 'comment'])
    : ofType('topic')
        .filter((d) => !d.hidden)
        .map((d) => ({ ...(d as Topic), slug: slugOf(d), related: null, commentCount: demo.approvedFor(d._id).length }))
  return sortTopics([...base.map((t) => ({ ...t, commentCount: (t.commentCount ?? 0) + approvedLocal(t._id) })), ...local])
}

export async function getTopic(slug: string): Promise<Topic | null> {
  const m = mem.topics.find((t) => t.slug === slug && !t.hidden)
  if (m) {
    const related = m.related ? ((await getComponents()).find((c) => c._id === m.related) ?? null) : null
    return { _id: m._id, title: m.title, slug: m.slug, authorName: m.authorName, body: m.body, pinned: false, createdAt: m.createdAt, related }
  }
  if (isSanityConfigured) return sanityFetch(Q.topic, { slug }, ['topic', 'component'])
  const d = ofType('topic').find((x) => slugOf(x) === slug && !x.hidden)
  if (!d) return null
  return { ...(d as Topic), slug: slugOf(d), related: d.related ? demo.component(byId.get(d.related._ref)!) : null }
}

export async function getComments(targetId: string): Promise<CommentDoc[]> {
  // Approved comments from the in-memory store (local mode without a Sanity write token).
  const local = mem.comments
    .filter((c) => c.target === targetId && c.status === 'approved')
    .map(({ _id, authorName, text, createdAt }) => ({ _id, authorName, text, createdAt }))
  if (isSanityConfigured) return [...(await sanityFetch<CommentDoc[]>(Q.comments, { id: targetId }, ['comment'])), ...local]
  return [...(demo.approvedFor(targetId) as CommentDoc[]), ...local]
}

/** Does a commentable document with this id exist (CMS, demo data or a user topic)? */
export async function targetExists(id: string): Promise<boolean> {
  if (mem.topics.some((t) => t._id === id && !t.hidden)) return true
  if (memPublished.components().some((c) => c._id === id) || memPublished.projects().some((p) => p._id === id)) return true
  if (isSanityConfigured) {
    return Boolean(await sanityFetch<string | null>(`*[_id == $id && _type in $types && ${PUB}][0]._id`, { id, types: COMMENTABLE_TYPES }, []))
  }
  return docs.some((d) => d._id === id && (COMMENTABLE_TYPES as readonly string[]).includes(d._type))
}

/** Titles and links for a set of comment targets (admin panel, account page). */
export async function describeTargets(ids: string[]): Promise<Record<string, { type: string; slug: string; title: string }>> {
  const out: Record<string, { type: string; slug: string; title: string }> = {}
  for (const t of mem.topics) if (ids.includes(t._id)) out[t._id] = { type: 'topic', slug: t.slug, title: t.title }
  for (const c of mem.components) if (ids.includes(c._id)) out[c._id] = { type: 'component', slug: c.slug, title: c.name }
  for (const p of mem.projects) if (ids.includes(p._id)) out[p._id] = { type: 'project', slug: p.slug, title: p.title.uk ?? p.slug }
  const rest = ids.filter((id) => !out[id])
  if (rest.length === 0) return out
  const rows: Raw[] = isSanityConfigured
    ? await sanityFetch<Raw[]>(`*[_id in $ids]{ _id, _type, "slug": slug.current, "title": coalesce(name, title.uk, title) }`, { ids: rest }, [])
    : docs.filter((d) => rest.includes(d._id)).map((d) => ({ _id: d._id, _type: d._type, slug: slugOf(d), title: d.name ?? d.title?.uk ?? d.title }))
  for (const r of rows) out[r._id] = { type: r._type, slug: r.slug, title: r.title }
  return out
}

export async function getStats(): Promise<{ components: number; projects: number; topics: number }> {
  const extraTopics = mem.topics.filter((t) => !t.hidden).length
  const base = isSanityConfigured
    ? await sanityFetch<{ components: number; projects: number; topics: number }>(Q.stats, {}, ['component', 'project', 'topic'])
    : { components: ofType('component').length, projects: ofType('project').length, topics: ofType('topic').length }
  return {
    components: base.components + memPublished.components().length,
    projects: base.projects + memPublished.projects().length,
    topics: base.topics + extraTopics,
  }
}

export async function getSlugs(type: 'component' | 'project' | 'topic'): Promise<string[]> {
  if (isSanityConfigured) {
    const q = type === 'component' ? Q.componentSlugs : type === 'project' ? Q.projectSlugs : Q.topicSlugs
    return [...(await sanityFetch<string[]>(q, {}, [type])), ...memSlugs(type)]
  }
  return [...ofType(type).map(slugOf), ...memSlugs(type)]
}

function memSlugs(type: 'component' | 'project' | 'topic'): string[] {
  if (type === 'component') return memPublished.components().map((c) => c.slug)
  if (type === 'project') return memPublished.projects().map((p) => p.slug)
  return []
}

/** Ids a visitor is allowed to comment on (used to validate the comment API). */
export const COMMENTABLE_TYPES = ['topic', 'component', 'project'] as const
