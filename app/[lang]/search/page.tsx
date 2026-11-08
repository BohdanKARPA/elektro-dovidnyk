import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLang } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'
import { searchSite } from '@/lib/search'

export async function generateMetadata({ params }: PageProps<'/[lang]/search'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  // Result pages are not indexed: they duplicate the content pages.
  return { title: getExtraDict(lang).searchTitle, robots: { index: false, follow: true } }
}

export default async function SearchPage({ params, searchParams }: PageProps<'/[lang]/search'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const x = getExtraDict(lang)
  const sp = await searchParams
  const q = (typeof sp.q === 'string' ? sp.q : '').slice(0, 80).trim()
  const hits = q ? await searchSite(q, lang) : []

  return (
    <>
      <h1>{x.searchTitle}</h1>
      <p className="lede">{x.searchIntro}</p>
      <form className="toolbar" role="search" action={`/${lang}/search`} method="get">
        <input type="search" name="q" defaultValue={q} placeholder={x.searchPlaceholder} aria-label={x.searchLabel} maxLength={80} />
        <button className="btn" type="submit">
          {x.searchButton}
        </button>
      </form>

      {q && q.length < 2 && <p className="lede">{x.searchShort}</p>}
      {q.length >= 2 && (
        <>
          <p className="lede" aria-live="polite">
            {hits.length ? x.searchFound(hits.length) : x.searchEmpty}
          </p>
          {hits.length > 0 && (
            <ul className="search-results">
              {hits.map((h) => (
                <li key={h.href}>
                  <Link href={h.href}>
                    <span className="kind">{x.kind[h.kind]}</span>
                    <h3>{h.title}</h3>
                    <p>{h.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
