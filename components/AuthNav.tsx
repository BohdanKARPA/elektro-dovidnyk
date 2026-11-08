'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/types'

type Me = { name: string; role: 'user' | 'admin'; blocked: boolean } | null

/** Header area: "Sign in" for guests, the user's name (→ account) and, for admins, the admin panel. */
export function AuthNav({ lang, labels }: { lang: Lang; labels: { signIn: string; admin: string; adminShort: string; account: string } }) {
  const pathname = usePathname()
  const [me, setMe] = useState<Me | undefined>(undefined)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return
          setMe(d.user ?? null)
          setUnread(Number(d.unread) || 0)
        })
        .catch(() => alive && setMe(null))
    load()
    // The chat reports fresh unread counts after it loads messages.
    const onUnread = (e: Event) => setUnread(Number((e as CustomEvent).detail) || 0)
    window.addEventListener('unread-changed', onUnread)
    window.addEventListener('auth-changed', load)
    return () => {
      alive = false
      window.removeEventListener('auth-changed', load)
      window.removeEventListener('unread-changed', onUnread)
    }
  }, [pathname])

  if (me === undefined) return <span className="auth-nav" aria-hidden="true" />
  if (!me) {
    return (
      <span className="auth-nav">
        <Link className="btn small" href={`/${lang}/login`}>
          {labels.signIn}
        </Link>
      </span>
    )
  }
  return (
    <span className="auth-nav">
      {me.role === 'admin' && (
        <Link className="admin-link" href={`/${lang}/admin`} title={labels.admin} aria-current={pathname.endsWith('/admin') ? 'page' : undefined}>
          {labels.adminShort}
        </Link>
      )}
      {unread > 0 && (
        <Link className="count-dot nav-dot" href={me.role === 'admin' ? `/${lang}/admin/messages` : `/${lang}/account#chat`} aria-label={`${unread} ✉`}>
          {unread}
        </Link>
      )}
      <Link className="user-chip" href={`/${lang}/account`} title={labels.account}>
        {me.name}
      </Link>
    </span>
  )
}
