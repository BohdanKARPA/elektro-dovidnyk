import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ComponentGuide } from '@/components/ComponentGuide'
import { getCategories, getComponents } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'
import { getSubmitDict } from '@/lib/i18n-submit'
import Link from 'next/link'

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps<'/[lang]/components'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return { title: getDict(lang).nav.components, alternates: { canonical: `/${lang}/components` } }
}

export default async function ComponentsPage({ params, searchParams }: PageProps<'/[lang]/components'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const x = getExtraDict(lang)
  const sp = await searchParams
  const initial = typeof sp.category === 'string' ? sp.category : undefined
  const [components, categories] = await Promise.all([getComponents(), getCategories()])

  return (
    <>
      <div className="section-head">
        <h1>{dict.nav.components}</h1>
        <Link className="btn ghost" href={`/${lang}/components/new`}>
          + {getSubmitDict(lang).addComponent}
        </Link>
      </div>
      <p className="lede">
        {lang === 'uk'
          ? 'Таблиця підбору: головні параметри кожного компонента в одному рядку. Натисніть на рядок, щоб відкрити картку з характеристиками.'
          : 'Selection guide: the key parameters of each part in one row. Click a row to open its full card.'}
      </p>
      <ComponentGuide
        key={initial ?? 'all'}
        lang={lang}
        dict={dict}
        initialCategory={categories.some((c) => c.slug === initial) ? initial : undefined}
        compareLabels={{ col: x.compareCol, reset: x.compareReset, max: x.compareMax, only: x.compareOnlyCategory }}
        categories={categories.map((c) => ({ slug: c.slug, title: t(c.title, lang) }))}
        rows={components.map((c) => ({
          id: c._id,
          name: c.name,
          slug: c.slug,
          manufacturer: c.manufacturer,
          summary: t(c.summary, lang),
          category: t(c.category?.title, lang),
          categorySlug: c.category?.slug,
          package: c.package,
          priceUah: c.priceUah,
          tags: c.tags,
        }))}
      />
    </>
  )
}
