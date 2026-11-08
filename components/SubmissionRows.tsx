import Link from 'next/link'
import { formatDate } from '@/lib/i18n'
import type { ClientSubmitDict } from '@/lib/i18n-submit'
import type { SubmissionRow } from '@/lib/submissions'
import type { Lang } from '@/lib/types'
import { SubmitButton } from './SubmitButton'

/**
 * Table of user submissions.
 * - Author view (no `action`): status, who decided and why, "Fix it" for returned ones, a link to the chat.
 * - Admin view (`action`): a note to the author plus publish / return for changes / reject.
 */
export function SubmissionRows({
  rows,
  l,
  lang,
  action,
  showAuthor = false,
  needsToken,
  discuss = true,
}: {
  rows: SubmissionRow[]
  l: ClientSubmitDict
  lang: Lang
  action?: (formData: FormData) => Promise<void>
  showAuthor?: boolean
  needsToken?: string
  /** Show "Discuss with an admin" (not for admins looking at their own submissions). */
  discuss?: boolean
}) {
  const admin = Boolean(action)
  return (
    <table className="admin-table submissions">
      <tbody>
        {rows.map((r) => {
          const href = `/${lang}/${r.kind === 'component' ? 'components' : 'projects'}/${r.slug}`
          const aiText = r.aiReview && (!r.aiReview.failed || admin) ? r.aiReview.reason || r.aiReview.verdict : null
          return (
            <tr key={r._id}>
              <td>
                <span className="dim">{l.kind[r.kind]}</span>
                <div>{r.status === 'published' ? <Link href={href}>{r.title}</Link> : <strong>{r.title}</strong>}</div>
                <div className="dim">
                  {showAuthor && r.authorName ? `${r.authorName}, ` : ''}
                  {formatDate(r.createdAt, lang)}
                </div>
              </td>
              <td>
                <span className={`badge ${r.status === 'published' ? 'approved' : r.status}`}>{l.status[r.status]}</span>
              </td>
              <td className="quote decision">
                {r.moderatorNote ? (
                  <span>
                    <strong>{l.decidedBy.admin}:</strong> {r.moderatorNote}
                  </span>
                ) : aiText ? (
                  <span className={r.aiReview?.failed ? 'ai-failed' : undefined}>
                    <strong>{l.decidedBy.ai}:</strong> {aiText}
                  </span>
                ) : (
                  <span className="dim">{r.submitted ? l.noAi : l.editorial}</span>
                )}
                {!admin && r.submitted && r.status !== 'published' && (
                  <div className="actions row-links">
                    {r.status === 'changes' && (
                      <Link className="btn small" href={`/${lang}/account/edit/${r._id}`}>
                        {l.fix}
                      </Link>
                    )}
                    {discuss && (
                      <Link className="btn ghost small" href={`/${lang}/account?about=${encodeURIComponent(r._id)}#chat`}>
                        {l.discuss}
                      </Link>
                    )}
                  </div>
                )}
              </td>
              {action && (
                <td className="moderate">
                  <form action={action} className="moderate-form">
                    <input type="hidden" name="id" value={r._id} />
                    <textarea name="note" rows={2} maxLength={500} required placeholder={l.notePh} aria-label={l.notePh} defaultValue={r.moderatorNote ?? ''} />
                    <div className="actions">
                      {r.status !== 'published' && (
                        <SubmitButton name="status" value="published" formNoValidate disabled={!r.editable} title={r.editable ? undefined : needsToken}>
                          {l.publish}
                        </SubmitButton>
                      )}
                      {r.status !== 'changes' && (
                        <SubmitButton className="btn small ghost" name="status" value="changes" disabled={!r.editable} title={r.editable ? l.noteRequired : needsToken}>
                          {l.toChanges}
                        </SubmitButton>
                      )}
                      {r.status !== 'rejected' && (
                        <SubmitButton className="btn small danger" name="status" value="rejected" disabled={!r.editable} title={r.editable ? l.noteRequired : needsToken}>
                          {l.reject}
                        </SubmitButton>
                      )}
                    </div>
                    {r.userId && (
                      <Link className="dim" href={`/${lang}/admin/messages?u=${encodeURIComponent(r.userId)}&about=${encodeURIComponent(r._id)}`}>
                        {l.writeAuthor}
                      </Link>
                    )}
                  </form>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
