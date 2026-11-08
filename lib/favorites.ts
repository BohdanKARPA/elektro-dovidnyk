'use client'

/**
 * Favourites live in the visitor's browser (localStorage), so they work for
 * guests too and need no server writes. Every read and write is wrapped in
 * try/catch: storage may be disabled (private mode, blocked site data).
 */
export type FavKind = 'component' | 'project'
export interface FavItem {
  kind: FavKind
  slug: string
}

const KEY = 'elektro:favorites:v1'
export const FAV_EVENT = 'favorites-changed'

export function readFavorites(): FavItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (x): x is FavItem => x && (x.kind === 'component' || x.kind === 'project') && typeof x.slug === 'string' && /^[a-z0-9-]{1,80}$/.test(x.slug),
    )
  } catch {
    return []
  }
}

export function writeFavorites(items: FavItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)))
  } catch {
    /* storage unavailable — the change lives only until reload */
  }
  window.dispatchEvent(new Event(FAV_EVENT))
}

export function toggleFavorite(item: FavItem): boolean {
  const list = readFavorites()
  const has = list.some((x) => x.kind === item.kind && x.slug === item.slug)
  writeFavorites(has ? list.filter((x) => !(x.kind === item.kind && x.slug === item.slug)) : [item, ...list])
  return !has
}
