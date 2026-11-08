import { getComments } from '@/lib/data'
import { formatDate, type Dict } from '@/lib/i18n'
import type { Lang } from '@/lib/types'
import { CommentForm } from './CommentForm'

export async function Comments({ targetId, lang, dict }: { targetId: string; lang: Lang; dict: Dict }) {
  const comments = await getComments(targetId)
  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">
        {dict.comments} ({comments.length})
      </h2>
      {comments.length === 0 && <p className="lede">{dict.noComments}</p>}
      {comments.map((c) => (
        <article key={c._id} className="comment">
          <header>
            <strong>{c.authorName}</strong>
            <time dateTime={c.createdAt}>{formatDate(c.createdAt, lang)}</time>
          </header>
          <p>{c.text}</p>
        </article>
      ))}
      <CommentForm targetId={targetId} dict={dict} />
    </section>
  )
}
