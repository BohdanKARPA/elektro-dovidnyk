'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Lang } from '@/lib/types'
import type { Dict } from '@/lib/i18n'
import { getAuthDict } from '@/lib/i18n-auth'
import type { ClientExtra } from '@/lib/i18n-extra'
import { AuthNav } from './AuthNav'

export function Header({ lang, dict, extra }: { lang: Lang; dict: Dict; extra: ClientExtra }) {
  const pathname = usePathname() || `/${lang}`
  const rest = pathname.replace(/^\/(uk|en)/, '')
  const items = [
    { href: `/${lang}/components`, label: dict.nav.components },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}/forum`, label: dict.nav.forum },
    { href: `/${lang}/tools`, label: extra.tools },
    { href: `/${lang}/about`, label: dict.nav.about },
  ]

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href={`/${lang}`} className="brand" aria-label={dict.siteName}>
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
          <span className="brand-name">{dict.siteName}</span>
        </Link>
        <nav className="nav" aria-label="Main">
          {items.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <Link
          className="icon-link"
          href={`/${lang}/search`}
          title={extra.searchLabel}
          aria-label={extra.searchLabel}
          aria-current={pathname.startsWith(`/${lang}/search`) ? 'page' : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </Link>
        <Link
          className="icon-link fav-link"
          href={`/${lang}/favorites`}
          title={extra.favorites}
          aria-label={extra.favorites}
          aria-current={pathname.startsWith(`/${lang}/favorites`) ? 'page' : undefined}
        >
          ★
        </Link>
        <div className="lang" aria-label="Language">
          {(['uk', 'en'] as const).map((l) => (
            <Link key={l} href={`/${l}${rest}`} aria-current={l === lang ? 'true' : undefined} hrefLang={l}>
              {l.toUpperCase()}
            </Link>
          ))}
        </div>
        <AuthNav lang={lang} labels={getAuthDict(lang)} />
      </div>
    </header>
  )
}
