import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ComponentSubmitForm } from '@/components/SubmitForms'
import { getCategories } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'
import { getSubmitDict } from '@/lib/i18n-submit'

export const metadata: Metadata = { robots: { index: false } }

export default async function NewComponentPage({ params }: PageProps<'/[lang]/components/new'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const l = getSubmitDict(lang)
  const categories = (await getCategories()).map((c) => ({ id: c._id, title: t(c.title, lang) }))

  return (
    <div style={{ maxWidth: 760 }}>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/components`}>{dict.nav.components}</Link>
      </nav>
      <h1>{l.newComponentTitle}</h1>
      <p className="lede">{l.newComponentIntro}</p>
      <ComponentSubmitForm lang={lang} l={l} categories={categories} />
    </div>
  )
}
