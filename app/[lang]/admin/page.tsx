import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'
import { getCurrentUser, listUsers, usersStoredInSanity } from '@/lib/auth'
import { getAllTopics, getModerationQueue, getRecentComments, type CommunityComment } from '@/lib/community'
import { formatDate, isLang } from '@/lib/i18n'
import { getAuthDict, type AuthDict } from '@/lib/i18n-auth'
import type { Lang } from '@/lib/types'
import { moderateComment, moderateSubmission, setTopicVisibility, setUserBlocked, setUserRole } from './actions'
import { SubmissionRows } from '@/components/SubmissionRows'
import { clientSubmitDict } from '@/lib/i18n-submit'
import { listThreads } from '@/lib/messages'
import { listSubmissions } from '@/lib/submissions'

export const metadata: Metadata = { title: 'Admin', robots: { index: false } }

function CommentRows({ list, l, lang }: { list: CommunityComment[]; l: AuthDict; lang: Lang }) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th scope="col">{l.col.author}</th>
          <th scope="col">{l.col.text}</th>
          <th scope="col">{l.col.target}</th>
          <th scope="col">{l.col.status}</th>
          <th scope="col" className="sr-right">
            {l.col.actions}
          </th>
        </tr>
      </thead>
      <tbody>
        {list.map((c) => (
          <tr key={c._id}>
            <td>
              <strong>{c.authorName}</strong>
              <div className="dim">{formatDate(c.createdAt, lang)}</div>
            </td>
            <td className="quote">{c.text}</td>
            <td>{c.targetHref ? <Link href={c.targetHref}>{c.targetTitle}</Link> : c.targetTitle}</td>
            <td>
              <span className={`badge ${c.status}`}>{l.commentStatus[c.status]}</span>
              {c.aiFlagged && <div className="dim">{l.aiFlagged}</div>}
            </td>
            <td>
              <div className="actions">
                {c.status !== 'approved' && (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={c._id} />
                    <input type="hidden" name="status" value="approved" />
                    <SubmitButton disabled={!c.editable} title={c.editable ? undefined : l.needsToken}>
                      {l.approve}
                    </SubmitButton>
                  </form>
                )}
                {c.status !== 'rejected' && (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={c._id} />
                    <input type="hidden" name="status" value="rejected" />
                    <SubmitButton className="btn small danger" disabled={!c.editable} title={c.editable ? undefined : l.needsToken}>
                      {l.reject}
                    </SubmitButton>
                  </form>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default async function AdminPage({ params }: PageProps<'/[lang]/admin'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const l = getAuthDict(lang)

  // Access control: guests → sign in; signed-in non-admins → 403 view.
  const me = await getCurrentUser()
  if (!me) redirect(`/${lang}/login?next=/${lang}/admin`)
  if (me.role !== 'admin' || me.blocked) {
    return (
      <div className="not-found">
        <h1>403</h1>
        <h2>{l.forbiddenTitle}</h2>
        <p>{l.forbiddenText}</p>
        <p>
          <Link className="btn" href={`/${lang}/account`}>
            {l.account}
          </Link>
        </p>
      </div>
    )
  }

  const [users, queue, recent, topics, submissions, threads] = await Promise.all([listUsers(), getModerationQueue(lang), getRecentComments(lang), getAllTopics(), listSubmissions(), listThreads()])
  const sl = clientSubmitDict(lang)
  const waiting = submissions.filter((s) => s.status === 'pending')
  const unreadMsgs = threads.reduce((n, t) => n + t.unread, 0)

  return (
    <>
      <div className="section-head">
        <h1>{l.adminTitle}</h1>
        <span className="actions">
          <Link className="btn ghost" href={`/${lang}/admin/messages`}>
            {sl.chat.inbox}
            {unreadMsgs > 0 && <span className="count-dot">{unreadMsgs}</span>}
          </Link>
          <a className="btn ghost" href="/studio">
            {l.openStudio}
          </a>
        </span>
      </div>
      <p className="lede">{l.adminIntro}</p>
      <p className="notice">{usersStoredInSanity ? l.storageSanity : l.storageMemory}</p>

      <div className="kpis">
        <div>
          <strong>{users.length}</strong>
          <span>{l.kpi.users}</span>
        </div>
        <div>
          <strong>{users.filter((u) => u.role === 'admin').length}</strong>
          <span>{l.kpi.admins}</span>
        </div>
        <div className={users.some((u) => u.blocked) ? 'alert' : undefined}>
          <strong>{users.filter((u) => u.blocked).length}</strong>
          <span>{l.kpi.blocked}</span>
        </div>
        <div className={queue.length > 0 ? 'alert' : undefined}>
          <strong>{queue.length}</strong>
          <span>{l.kpi.pending}</span>
        </div>
        <div className={waiting.length > 0 ? 'alert' : undefined}>
          <strong>{waiting.length}</strong>
          <span>{sl.status.pending}</span>
        </div>
        <div>
          <strong>{topics.length}</strong>
          <span>{l.kpi.topics}</span>
        </div>
      </div>

      <section className="section" aria-labelledby="submissions">
        <h2 id="submissions">
          {sl.queue} ({waiting.length})
        </h2>
        <p className="lede">{sl.queueIntro}</p>
        {submissions.length === 0 ? (
          <p className="lede">{sl.queueEmpty}</p>
        ) : (
          <SubmissionRows rows={submissions} l={sl} lang={lang} action={moderateSubmission} showAuthor needsToken={l.needsToken} />
        )}
      </section>

      <section className="section" aria-labelledby="queue">
        <h2 id="queue">
          {l.moderationTitle} ({queue.length})
        </h2>
        {queue.length === 0 ? <p className="lede">{l.queueEmpty}</p> : <CommentRows list={queue} l={l} lang={lang} />}
      </section>

      <section className="section" aria-labelledby="users">
        <h2 id="users">{l.usersTitle}</h2>
        {users.length === 0 ? (
          <p className="lede">{l.noUsers}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{l.col.name}</th>
                <th scope="col">{l.col.email}</th>
                <th scope="col">{l.col.role}</th>
                <th scope="col">{l.col.status}</th>
                <th scope="col">{l.col.registered}</th>
                <th scope="col">{l.col.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u._id === me._id
                return (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.name}</strong>
                      {self && <div className="dim">{l.you}</div>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role}`}>{l.roles[u.role]}</span>
                    </td>
                    <td>{u.blocked ? <span className="badge blocked">{l.blocked}</span> : l.active}</td>
                    <td className="dim">{formatDate(u.createdAt, lang)}</td>
                    <td>
                      <div className="actions">
                        <form action={setUserRole}>
                          <input type="hidden" name="id" value={u._id} />
                          <input type="hidden" name="role" value={u.role === 'admin' ? 'user' : 'admin'} />
                          <SubmitButton className="btn small ghost" disabled={self}>
                            {u.role === 'admin' ? l.makeUser : l.makeAdmin}
                          </SubmitButton>
                        </form>
                        <form action={setUserBlocked}>
                          <input type="hidden" name="id" value={u._id} />
                          <input type="hidden" name="blocked" value={u.blocked ? 'false' : 'true'} />
                          <SubmitButton
                            className={u.blocked ? 'btn small' : 'btn small danger'}
                            disabled={self || u.role === 'admin'}
                            title={u.role === 'admin' && !self ? l.adminCantBeBlocked : undefined}
                          >
                            {u.blocked ? l.unblock : l.block}
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="section" aria-labelledby="topics">
        <h2 id="topics">{l.topicsTitle}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">{l.col.topic}</th>
              <th scope="col">{l.col.author}</th>
              <th scope="col">{l.col.status}</th>
              <th scope="col">{l.col.actions}</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t._id}>
                <td>
                  {t.hidden ? t.title : <Link href={`/${lang}/forum/${t.slug}`}>{t.title}</Link>}
                  <div className="dim">{formatDate(t.createdAt, lang)}</div>
                </td>
                <td>{t.authorName}</td>
                <td>
                  <span className={`badge ${t.hidden ? 'rejected' : 'approved'}`}>{t.hidden ? l.topicHiddenBadge : l.topicVisibleBadge}</span>
                </td>
                <td>
                  <div className="actions">
                    <form action={setTopicVisibility}>
                      <input type="hidden" name="id" value={t._id} />
                      <input type="hidden" name="hidden" value={t.hidden ? 'false' : 'true'} />
                      <SubmitButton className={t.hidden ? 'btn small' : 'btn small danger'} disabled={!t.editable} title={t.editable ? undefined : l.needsToken}>
                        {t.hidden ? l.show : l.hide}
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {recent.length > 0 && (
        <section className="section" aria-labelledby="recent">
          <h2 id="recent">{l.recentTitle}</h2>
          <CommentRows list={recent} l={l} lang={lang} />
        </section>
      )}
    </>
  )
}
