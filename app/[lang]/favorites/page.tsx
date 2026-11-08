import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FavoritesList } from '@/components/FavoritesList'
import { getComponents, getProjects } from '@/lib/data'
import { isLang, t } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps<'/[lang]/favorites'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return { title: getExtraDict(lang).favorites, robots: { index: false, follow: true } }
}

export default async function FavoritesPage({ params }: PageProps<'/[lang]/favorites'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const x = getExtraDict(lang)
  const [components, projects] = await Promise.all([getComponents(), getProjects()])
  const catalog = [
    ...components.map((c) => ({ kind: 'component' as const, slug: c.slug, title: c.name, summary: t(c.summary, lang), href: `/${lang}/components/${c.slug}` })),
    ...projects.map((p) => ({ kind: 'project' as const, slug: p.slug, title: t(p.title, lang), summary: t(p.summary, lang), href: `/${lang}/projects/${p.slug}` })),
  ]

  return (
    <>
      <h1>{x.favorites}</h1>
      <p className="lede">{x.favIntro}</p>
      <FavoritesList
        catalog={catalog}
        labels={{ empty: x.favEmpty, clear: x.favClear, remove: x.compareRemove, kind: { component: x.kind.component, project: x.kind.project } }}
      />
    </>
  )
}
