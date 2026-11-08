'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Dict } from '@/lib/i18n'
import type { Lang } from '@/lib/types'

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'ok'; approved: boolean } | { kind: 'error'; message: string }
type Me = { name: string; role: string; blocked: boolean } | null

export function CommentForm({ targetId, dict, lang }: { targetId: string; dict: Dict; lang: Lang }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [me, setMe] = useState<Me | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null))
  }, [])

  if (me === undefined) return null

  // Restriction: guests see a sign-in prompt instead of the form.
  if (me === null) {
    return (
      <div className="comment-form">
        <p className="form-note">{dict.loginRequired}</p>
        <div>
          <Link className="btn" href={`/${lang}/login`}>
            {dict.login}
          </Link>
        </div>
      </div>
    )
  }
  if (me.blocked) {
    return (
      <div className="comment-form">
        <p className="form-note err">{dict.blockedMsg}</p>
      </div>
    )
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    setState({ kind: 'sending' })
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, text: data.get('text'), website: data.get('website') }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          res.status === 429
            ? dict.tooMany
            : res.status === 401
              ? dict.loginRequired
              : res.status === 403
                ? dict.blockedMsg
                : res.status === 400
                  ? dict.invalid
                  : dict.error
        setState({ kind: 'error', message })
        return
      }
      form.reset()
      setState({ kind: 'ok', approved: json.status === 'approved' })
      if (json.status === 'approved') router.refresh()
    } catch {
      setState({ kind: 'error', message: dict.error })
    }
  }

  return (
    <form className="comment-form" onSubmit={onSubmit}>
      <h3>{dict.leaveComment}</h3>
      <p className="form-note">
        {dict.writingAs} <strong>{me.name}</strong>
      </p>
      <label>
        {dict.message}
        <textarea name="text" required minLength={3} maxLength={2000} rows={5} />
      </label>
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <button className="btn" type="submit" disabled={state.kind === 'sending'}>
          {state.kind === 'sending' ? dict.sending : dict.send}
        </button>
      </div>
      <p className="form-note" role="status" aria-live="polite">
        {state.kind === 'ok' && <span className="ok">{state.approved ? dict.sentApproved : dict.sentPending}</span>}
        {state.kind === 'error' && <span className="err">{state.message}</span>}
      </p>
    </form>
  )
}
