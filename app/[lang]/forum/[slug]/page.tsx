import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/Comments'
import { getSlugs, getTopic } from '@/lib/data'
import { formatDate, getDict, isLang, LANGS, t } from '@/lib/i18n'

export const revalidate = 600

export async function generateStaticParams() {
  const slugs = await getSlugs('topic')
  return LANGS.flatMap((lang) => slugs.map((slug) => ({ lang, slug })))
}

export async function generateMetadata({ params }: PageProps<'/[lang]/forum/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLang(lang)) return {}
  const topic = await getTopic(slug)
  if (!topic) return {}
  return { title: topic.title, description: topic.body.slice(0, 155), alternates: { canonical: `/${lang}/forum/${slug}` } }
}

export default async function TopicPage({ params }: PageProps<'/[lang]/forum/[slug]'>) {
  const { lang, slug } = await params
  if (!isLang(lang)) notFound()
  const topic = await getTopic(slug)
  if (!topic) notFound()
  const dict = getDict(lang)

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/forum`}>{dict.nav.forum}</Link>
      </nav>
      <h1>{topic.title}</h1>
      <div className="meta-line">
        {topic.authorName && <span>{topic.authorName}</span>}
        <span>{formatDate(topic.createdAt, lang)}</span>
        {topic.related && (
          <span>
            {dict.related}: <Link href={`/${lang}/components/${topic.related.slug}`}>{topic.related.name}</Link>
            {' — '}
            {t(topic.related.summary, lang)}
          </span>
        )}
      </div>
      <div className="question">
        <p>{topic.body}</p>
      </div>
      <Comments targetId={topic._id} lang={lang} dict={dict} />
    </>
  )
}
