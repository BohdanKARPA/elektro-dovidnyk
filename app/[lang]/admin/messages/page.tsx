import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChatBox } from '@/components/ChatBox'
import { findUserById, getCurrentUser } from '@/lib/auth'
import { formatDate, isLang } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'
import { clientSubmitDict } from '@/lib/i18n-submit'
import { listThreads } from '@/lib/messages'
import { listSubmissions } from '@/lib/submissions'

export const metadata: Metadata = { title: 'Messages', robots: { index: false } }

const ID = /^[A-Za-z0-9._-]{1,128}$/

/** Admin inbox: every user's conversation; ?u=<userId> opens one to reply. */
export default async function AdminMessagesPage({ params, searchParams }: PageProps<'/[lang]/admin/messages'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const me = await getCurrentUser()
  if (!me) redirect(`/${lang}/login?next=/${lang}/admin/messages`)
  const la = getAuthDict(lang)
  if (me.role !== 'admin' || me.blocked) {
    return (
      <div className="not-found">
        <h1>403</h1>
        <h2>{la.forbiddenTitle}</h2>
        <p>{la.forbiddenText}</p>
      </div>
    )
  }

  const l = clientSubmitDict(lang)
  const sp = await searchParams
  const u = typeof sp.u === 'string' && ID.test(sp.u) ? sp.u : undefined
  const aboutId = typeof sp.about === 'string' && ID.test(sp.about) ? sp.about : undefined
  const [threads, person, subs] = await Promise.all([listThreads(), u ? findUserById(u) : null, aboutId ? listSubmissions() : []])
  const about = aboutId ? subs.find((s) => s._id === aboutId) : undefined

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/admin`}>{la.adminTitle}</Link>
      </nav>
      <h1>{l.chat.inbox}</h1>

      {u && person ? (
        <section className="chat-section" aria-labelledby="thread-title">
          <p>
            <Link href={`/${lang}/admin/messages`}>{l.chat.back}</Link>
          </p>
          <h2 id="thread-title">
            {l.chat.with} {person.name}
          </h2>
          <p className="dim">{person.email}</p>
          <ChatBox lang={lang} l={l} side="admin" thread={u} about={about ? { id: about._id, title: about.title } : null} />
        </section>
      ) : (
        <>
          <p className="lede">{l.chat.inboxIntro}</p>
          {threads.length === 0 ? (
            <p className="lede">{l.chat.inboxEmpty}</p>
          ) : (
            <ul className="topic-list inbox">
              {threads.map((t) => (
                <li key={t.userId}>
                  <Link href={`/${lang}/admin/messages?u=${encodeURIComponent(t.userId)}`}>
                    <span className="topic-title">
                      {t.userName}
                      <span className="dim inbox-last">
                        {t.lastFrom === 'admin' ? `${l.chat.you}: ` : ''}
                        {t.lastText.length > 90 ? `${t.lastText.slice(0, 90)}…` : t.lastText}
                      </span>
                    </span>
                    {t.unread > 0 && (
                      <span className="badge unread">
                        {t.unread} {l.chat.unread}
                      </span>
                    )}
                    <span className="topic-meta">{formatDate(t.lastAt, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
