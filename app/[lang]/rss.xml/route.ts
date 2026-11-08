import { getProjects, getTopics } from '@/lib/data'
import { getDict, isLang, LANGS, t } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'

export const revalidate = 3600

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/** Escape text for XML element content and attributes. */
const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string)

/** RSS 2.0 feed: new DIY projects and forum topics, newest first. */
export async function GET(_req: Request, { params }: RouteContext<'/[lang]/rss.xml'>) {
  const { lang } = await params
  if (!isLang(lang)) return new Response('Not found', { status: 404 })
  const dict = getDict(lang)
  const x = getExtraDict(lang)
  const [projects, topics] = await Promise.all([getProjects(), getTopics()])

  const items = [
    ...projects.map((p) => ({
      title: t(p.title, lang),
      link: `${base}/${lang}/projects/${p.slug}`,
      description: t(p.summary, lang),
      date: p.publishedAt,
      category: dict.nav.projects,
    })),
    ...topics.map((tp) => ({
      title: tp.title,
      link: `${base}/${lang}/forum/${tp.slug}`,
      description: tp.body.slice(0, 300),
      date: tp.createdAt,
      category: dict.nav.forum,
    })),
  ]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 30)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(`${dict.siteName} — ${x.rssTitle}`)}</title>
<link>${base}/${lang}</link>
<description>${esc(dict.tagline)}</description>
<language>${lang === 'uk' ? 'uk-UA' : 'en-GB'}</language>
<atom:link href="${base}/${lang}/rss.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (i) => `<item>
<title>${esc(i.title)}</title>
<link>${esc(i.link)}</link>
<guid isPermaLink="true">${esc(i.link)}</guid>
<category>${esc(i.category)}</category>
<description>${esc(i.description)}</description>${i.date ? `\n<pubDate>${new Date(i.date).toUTCString()}</pubDate>` : ''}
</item>`,
  )
  .join('\n')}
</channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
