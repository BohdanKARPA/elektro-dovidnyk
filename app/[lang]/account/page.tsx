import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
import { getCurrentUser } from '@/lib/auth'
import { getUserComments, getUserTopics } from '@/lib/community'
import { formatDate, isLang } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'
import { SubmissionRows } from '@/components/SubmissionRows'
import { clientSubmitDict } from '@/lib/i18n-submit'
import { ChatBox } from '@/components/ChatBox'
import { listUserSubmissions } from '@/lib/submissions'

export const metadata: Metadata = { robots: { index: false } }

export default async function AccountPage({ params, searchParams }: PageProps<'/[lang]/account'>) {
  const { lang } = await params
  const aboutId = (await searchParams).about
  if (!isLang(lang)) notFound()
  const user = await getCurrentUser()
  if (!user) redirect(`/${lang}/login?next=/${lang}/account`)
  const l = getAuthDict(lang)
  const [comments, topics, submissions] = await Promise.all([getUserComments(user._id, lang), getUserTopics(user._id), listUserSubmissions(user._id)])
  const sl = clientSubmitDict(lang)
  const about = typeof aboutId === 'string' ? submissions.find((s) => s._id === aboutId) : undefined

  return (
    <>
      <div className="section-head">
        <h1>{l.accountTitle}</h1>
        <LogoutButton label={l.signOut} home={`/${lang}`} />
      </div>
      {user.blocked && <p className="notice">{l.blockedNote}</p>}

      <div className="detail">
        <article>
          <h2>{l.myComments}</h2>
          {comments.length === 0 ? (
            <p className="lede">{l.nothingYet}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{l.col.text}</th>
                  <th scope="col">{l.col.target}</th>
                  <th scope="col">{l.col.status}</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c._id}>
                    <td className="quote">{c.text}</td>
                    <td>{c.targetHref ? <Link href={c.targetHref}>{c.targetTitle}</Link> : c.targetTitle}</td>
                    <td>
                      <span className={`badge ${c.status}`}>{l.commentStatus[c.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ marginTop: 40 }}>{sl.mine}</h2>
          {submissions.length === 0 ? (
            <p className="lede">{l.nothingYet}</p>
          ) : (
            <SubmissionRows rows={submissions} l={sl} lang={lang} />
          )}
          <div className="actions" style={{ marginTop: 16 }}>
            <Link className="btn ghost small" href={`/${lang}/components/new`}>
              + {sl.addComponent}
            </Link>
            <Link className="btn ghost small" href={`/${lang}/projects/new`}>
              + {sl.addProject}
            </Link>
          </div>

          <section id="chat" className="section chat-section" aria-labelledby="chat-title">
            <h2 id="chat-title">{sl.chat.title}</h2>
            <p className="lede">{sl.chat.intro}</p>
            <ChatBox lang={lang} l={sl} side="user" about={about ? { id: about._id, title: about.title } : null} />
          </section>

          <h2 style={{ marginTop: 40 }}>{l.myTopics}</h2>
          {topics.length === 0 ? (
            <p className="lede">{l.nothingYet}</p>
          ) : (
            <ul className="topic-list">
              {topics.map((t) => (
                <li key={t._id}>
                  <Link href={`/${lang}/forum/${t.slug}`}>
                    <span className="topic-title">{t.title}</span>
                    <span className={`badge ${t.hidden ? 'rejected' : ''}`}>{t.hidden ? l.topicHiddenBadge : l.topicVisibleBadge}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <aside>
          <table className="specs">
            <caption>{user.name}</caption>
            <tbody>
              <tr>
                <th scope="row">{l.email}</th>
                <td>{user.email}</td>
              </tr>
              <tr>
                <th scope="row">{l.role}</th>
                <td>
                  <span className={`badge ${user.role}`}>{l.roles[user.role]}</span>
                </td>
              </tr>
              <tr>
                <th scope="row">{l.status}</th>
                <td>{user.blocked ? <span className="badge blocked">{l.blocked}</span> : l.active}</td>
              </tr>
              <tr>
                <th scope="row">{l.memberSince}</th>
                <td>{formatDate(user.createdAt, lang)}</td>
              </tr>
            </tbody>
          </table>
          <h3 style={{ marginTop: 28 }}>{l.permissionsTitle}</h3>
          <ul className="perm-list">
            {l.permissions[user.role].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {user.role === 'admin' && (
            <p>
              <Link className="btn" href={`/${lang}/admin`}>
                {l.admin}
              </Link>
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
