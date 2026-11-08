import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTopics } from '@/lib/data'
import { formatDate, getDict, isLang } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'

export const revalidate = 600

export async function generateMetadata({ params }: PageProps<'/[lang]/forum'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return { title: getDict(lang).nav.forum, alternates: { canonical: `/${lang}/forum` } }
}

export default async function ForumPage({ params }: PageProps<'/[lang]/forum'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const topics = await getTopics()

  return (
    <>
      <div className="section-head">
        <h1>{dict.nav.forum}</h1>
        <Link className="btn" href={`/${lang}/forum/new`}>
          {getAuthDict(lang).newTopic}
        </Link>
      </div>
      <p className="lede">{dict.forumIntro}</p>
      <ul className="topic-list">
        {topics.map((topic) => (
          <li key={topic._id}>
            <Link href={`/${lang}/forum/${topic.slug}`}>
              <span className="topic-title">
                {topic.pinned && <span className="pin">{dict.pinned}</span>}
                {topic.title}
              </span>
              <span className="topic-meta">
                {topic.commentCount ?? 0} {dict.replies}
              </span>
              <span className="topic-meta">{formatDate(topic.createdAt, lang)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
