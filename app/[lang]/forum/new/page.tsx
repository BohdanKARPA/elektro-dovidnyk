import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TopicForm } from '@/components/TopicForm'
import { getComponents } from '@/lib/data'
import { getDict, isLang } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'

export const metadata: Metadata = { robots: { index: false } }

export default async function NewTopicPage({ params }: PageProps<'/[lang]/forum/new'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const l = getAuthDict(lang)
  const components = (await getComponents()).map((c) => ({ id: c._id, name: c.name }))

  return (
    <div style={{ maxWidth: 680 }}>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/forum`}>{dict.nav.forum}</Link>
      </nav>
      <h1>{l.newTopicTitle}</h1>
      <p className="lede">{l.newTopicIntro}</p>
      <TopicForm lang={lang} labels={l} components={components} blockedMsg={dict.blockedMsg} genericError={dict.error} />
    </div>
  )
}
