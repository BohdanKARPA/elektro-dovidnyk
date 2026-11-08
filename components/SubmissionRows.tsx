import Link from 'next/link'
import { formatDate } from '@/lib/i18n'
import type { SubmitDict } from '@/lib/i18n-submit'
import type { SubmissionRow } from '@/lib/submissions'
import type { Lang } from '@/lib/types'
import { SubmitButton } from './SubmitButton'

/** Table of user submissions; with `action` it shows publish / reject buttons (admin). */
export function SubmissionRows({
  rows,
  l,
  lang,
  action,
  showAuthor = false,
  needsToken,
}: {
  rows: SubmissionRow[]
  l: SubmitDict
  lang: Lang
  action?: (formData: FormData) => Promise<void>
  showAuthor?: boolean
  needsToken?: string
}) {
  return (
    <table className="admin-table">
      <tbody>
        {rows.map((r) => {
          const href = `/${lang}/${r.kind === 'component' ? 'components' : 'projects'}/${r.slug}`
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
              <td className="quote">
                {r.aiReview ? (
                  <>
                    {l.aiSays} {r.aiReview.reason || r.aiReview.verdict}
                  </>
                ) : (
                  <span className="dim">{l.noAi}</span>
                )}
              </td>
              {action && (
                <td>
                  <div className="actions">
                    {r.status !== 'published' && (
                      <form action={action}>
                        <input type="hidden" name="id" value={r._id} />
                        <input type="hidden" name="status" value="published" />
                        <SubmitButton disabled={!r.editable} title={r.editable ? undefined : needsToken}>
                          {l.publish}
                        </SubmitButton>
                      </form>
                    )}
                    {r.status !== 'rejected' && (
                      <form action={action}>
                        <input type="hidden" name="id" value={r._id} />
                        <input type="hidden" name="status" value="rejected" />
                        <SubmitButton className="btn small danger" disabled={!r.editable} title={r.editable ? undefined : needsToken}>
                          {l.reject}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
