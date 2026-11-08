import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectSubmitForm } from '@/components/SubmitForms'
import { getComponents } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'
import { getSubmitDict } from '@/lib/i18n-submit'

export const metadata: Metadata = { robots: { index: false } }

export default async function NewProjectPage({ params }: PageProps<'/[lang]/projects/new'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const l = getSubmitDict(lang)
  const parts = (await getComponents()).map((c) => ({ id: c._id, name: c.name, category: t(c.category?.title, lang) }))

  return (
    <div style={{ maxWidth: 760 }}>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/projects`}>{dict.nav.projects}</Link>
      </nav>
      <h1>{l.newProjectTitle}</h1>
      <p className="lede">{l.newProjectIntro}</p>
      <ProjectSubmitForm lang={lang} l={l} parts={parts} difficulty={dict.difficulty} />
    </div>
  )
}
