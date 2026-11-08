'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import type { AuthDict } from '@/lib/i18n-auth'

type Mode = 'login' | 'register'

/** Sign-in and registration in one card; the tab indicator slides to show which form is active. */
export function AuthForm({ labels, next }: { labels: AuthDict; next: string }) {
  const [mode, setMode] = useState<Mode>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const { error: code } = await res.json().catch(() => ({ error: 'generic' }))
        setError(labels.errors[code as keyof AuthDict['errors']] ?? labels.errors.generic)
        return
      }
      window.dispatchEvent(new Event('auth-changed'))
      router.push(next)
      router.refresh()
    } catch {
      setError(labels.errors.generic)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="tabs" role="tablist" data-mode={mode}>
        <span className="indicator" aria-hidden="true" />
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
          >
            {labels.tabs[m]}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} key={mode}>
        {mode === 'register' && (
          <label>
            {labels.name}
            <input name="name" required minLength={2} maxLength={40} autoComplete="nickname" />
          </label>
        )}
        <label>
          {labels.email}
          <input name="email" type="email" required maxLength={120} autoComplete="email" />
        </label>
        <label>
          {labels.password}
          <input
            name="password"
            type="password"
            required
            minLength={mode === 'register' ? 8 : 1}
            maxLength={100}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {mode === 'register' && <span className="hint">{labels.passwordHint}</span>}
        </label>
        <div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? labels.working : mode === 'login' ? labels.submitLogin : labels.submitRegister}
          </button>
        </div>
        <p className="form-note err" role="alert">
          {error}
        </p>
      </form>
    </div>
  )
}
