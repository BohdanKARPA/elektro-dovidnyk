'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FAV_EVENT, readFavorites, writeFavorites, type FavItem, type FavKind } from '@/lib/favorites'

export interface FavCatalogItem {
  kind: FavKind
  slug: string
  title: string
  summary: string
  href: string
}

export function FavoritesList({
  catalog,
  labels,
}: {
  catalog: FavCatalogItem[]
  labels: { empty: string; clear: string; remove: string; kind: Record<FavKind, string> }
}) {
  const [items, setItems] = useState<FavItem[] | undefined>(undefined)

  useEffect(() => {
    const sync = () => setItems(readFavorites())
    sync()
    window.addEventListener(FAV_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FAV_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (items === undefined) return null
  // Keep only entries that still exist on the site (a document may have been deleted in the CMS).
  const rows = items
    .map((f) => catalog.find((c) => c.kind === f.kind && c.slug === f.slug))
    .filter((c): c is FavCatalogItem => Boolean(c))

  if (rows.length === 0) return <p className="lede">{labels.empty}</p>

  return (
    <>
      <ul className="search-results">
        {rows.map((r) => (
          <li key={`${r.kind}:${r.slug}`} className="fav-row">
            <Link href={r.href}>
              <span className="kind">{labels.kind[r.kind]}</span>
              <h3>{r.title}</h3>
              <p>{r.summary}</p>
            </Link>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => writeFavorites(items.filter((x) => !(x.kind === r.kind && x.slug === r.slug)))}
              aria-label={`${labels.remove}: ${r.title}`}
            >
              {labels.remove}
            </button>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 20 }}>
        <button type="button" className="btn ghost small" onClick={() => writeFavorites([])}>
          {labels.clear}
        </button>
      </p>
    </>
  )
}
