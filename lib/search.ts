import 'server-only'
import { getComponents, getProjects, getTopics } from './data'
import { t } from './i18n'
import type { Lang } from './types'
import { isBoard } from './part-kind'

export interface SearchHit {
  kind: 'component' | 'project' | 'topic'
  href: string
  title: string
  excerpt: string
  score: number
}

const norm = (s: string) => s.toLocaleLowerCase('uk').normalize('NFKC')

/**
 * Site-wide search over components, projects and forum topics.
 * The dataset is small, so it is searched in memory with the same code in
 * Sanity and demo mode. Every query word must match (AND); a match in the
 * title ranks higher than one in the body.
 */
export async function searchSite(query: string, lang: Lang): Promise<SearchHit[]> {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 0).slice(0, 8)
  if (words.join('').length < 2) return []

  const [components, projects, topics] = await Promise.all([getComponents(), getProjects(), getTopics()])
  const hits: SearchHit[] = []

  const rank = (title: string, fields: string[]) => {
    const ttl = norm(title)
    const all = norm([title, ...fields].join(' \n '))
    if (!words.every((w) => all.includes(w))) return 0
    return words.reduce((s, w) => s + (ttl.includes(w) ? 3 : 1), 0)
  }

  for (const c of components) {
    // The kind words let "плата" / "мікросхема" (or "board" / "chip") find the right parts in both languages.
    const kind = isBoard(c) ? 'плата модуль board module' : 'мікросхема чип chip ic'
    const score = rank(c.name, [c.manufacturer ?? '', t(c.summary, lang), t(c.category?.title, lang), ...(c.tags ?? []), c.package ?? '', kind])
    if (score) hits.push({ kind: 'component', href: `/${lang}/components/${c.slug}`, title: c.name, excerpt: t(c.summary, lang), score })
  }
  for (const p of projects) {
    const title = t(p.title, lang)
    const score = rank(title, [t(p.summary, lang), p.author?.name ?? ''])
    if (score) hits.push({ kind: 'project', href: `/${lang}/projects/${p.slug}`, title, excerpt: t(p.summary, lang), score })
  }
  for (const tp of topics) {
    const score = rank(tp.title, [tp.body, tp.authorName ?? ''])
    if (score) {
      const excerpt = tp.body.length > 180 ? `${tp.body.slice(0, 180).trimEnd()}…` : tp.body
      hits.push({ kind: 'topic', href: `/${lang}/forum/${tp.slug}`, title: tp.title, excerpt, score })
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
}
