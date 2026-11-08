'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import type { AuthDict } from '@/lib/i18n-auth'
import type { Lang } from '@/lib/types'

type Me = { name: string; blocked: boolean } | null

export function TopicForm({ lang, labels, components, blockedMsg, genericError }: { lang: Lang; labels: AuthDict; components: { id: string; name: string }[]; blockedMsg: string; genericError: string }) {
  const [me, setMe] = useState<Me | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null))
  }, [])

  if (me === undefined) return null
  if (me === null) {
    return (
      <div className="comment-form">
        <p className="form-note">{labels.topicsAuthRequired}</p>
        <div>
          <Link className="btn" href={`/${lang}/login?next=/${lang}/forum/new`}>
            {labels.signIn}
          </Link>
        </div>
      </div>
    )
  }
  if (me.blocked) return <p className="notice">{blockedMsg}</p>

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNote(json.error === 'too_many_requests' ? labels.topicErrors.too_many_requests : json.error === 'invalid_input' ? labels.topicErrors.invalid_input : json.error === 'blocked' ? blockedMsg : genericError)
        return
      }
      if (json.status === 'hidden') {
        setNote(labels.topicErrors.hidden)
        return
      }
      router.push(`/${lang}/forum/${json.slug}`)
      router.refresh()
    } catch {
      setNote(genericError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <label>
        {labels.topicTitle}
        <input name="title" required minLength={8} maxLength={140} />
      </label>
      <label>
        {labels.topicBody}
        <textarea name="body" required minLength={20} maxLength={4000} rows={8} />
      </label>
      <label>
        {labels.topicRelated}
        <select name="related" defaultValue="">
          <option value="">{labels.noRelated}</option>
          {components.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? labels.working : labels.publish}
        </button>
      </div>
      <p className="form-note err" role="alert">
        {note}
      </p>
    </form>
  )
}
