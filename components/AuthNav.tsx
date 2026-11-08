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

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => alive && setMe(d.user ?? null))
        .catch(() => alive && setMe(null))
    load()
    window.addEventListener('auth-changed', load)
    return () => {
      alive = false
      window.removeEventListener('auth-changed', load)
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
      <Link className="user-chip" href={`/${lang}/account`} title={labels.account}>
        {me.name}
      </Link>
    </span>
  )
}
