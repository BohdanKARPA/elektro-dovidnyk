'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Dict } from '@/lib/i18n'

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'ok'; approved: boolean } | { kind: 'error'; message: string }

export function CommentForm({ targetId, dict }: { targetId: string; dict: Dict }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const router = useRouter()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    setState({ kind: 'sending' })
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          authorName: data.get('authorName'),
          text: data.get('text'),
          website: data.get('website'),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          res.status === 429 ? dict.tooMany : res.status === 503 ? dict.demo : res.status === 400 ? dict.invalid : dict.error
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
      <label>
        {dict.name}
        <input name="authorName" required minLength={2} maxLength={40} autoComplete="nickname" />
      </label>
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
