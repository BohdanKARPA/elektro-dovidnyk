'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Lang } from '@/lib/types'
import type { Dict } from '@/lib/i18n'

export function Header({ lang, dict }: { lang: Lang; dict: Dict }) {
  const pathname = usePathname() || `/${lang}`
  const rest = pathname.replace(/^\/(uk|en)/, '')
  const items = [
    { href: `/${lang}`, label: dict.nav.home, exact: true },
    { href: `/${lang}/components`, label: dict.nav.components },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}/forum`, label: dict.nav.forum },
    { href: `/${lang}/about`, label: dict.nav.about },
  ]

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href={`/${lang}`} className="brand">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect x="6" y="6" width="16" height="16" rx="2" fill="currentColor" />
            {[9, 14, 19].map((p) => (
              <g key={p} stroke="var(--mask)" strokeWidth="2">
                <line x1={p} y1="1" x2={p} y2="6" />
                <line x1={p} y1="22" x2={p} y2="27" />
                <line x1="1" y1={p} x2="6" y2={p} />
                <line x1="22" y1={p} x2="27" y2={p} />
              </g>
            ))}
          </svg>
          {dict.siteName}
        </Link>
        <nav className="nav" aria-label="Main">
          {items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="lang" aria-label="Language">
          {(['uk', 'en'] as const).map((l) => (
            <Link key={l} href={`/${l}${rest}`} aria-current={l === lang ? 'true' : undefined} hrefLang={l}>
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
