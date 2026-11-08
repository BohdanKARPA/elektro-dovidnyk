'use client'

import { useEffect, useState } from 'react'
import { FAV_EVENT, readFavorites, toggleFavorite, type FavKind } from '@/lib/favorites'

export function FavoriteButton({ kind, slug, labels }: { kind: FavKind; slug: string; labels: { add: string; remove: string } }) {
  // undefined until mounted: the server does not know the visitor's favourites.
  const [on, setOn] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const sync = () => setOn(readFavorites().some((x) => x.kind === kind && x.slug === slug))
    sync()
    window.addEventListener(FAV_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FAV_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [kind, slug])

  return (
    <button
      type="button"
      className={`btn ghost small fav${on ? ' on' : ''}`}
      aria-pressed={on ?? false}
      disabled={on === undefined}
      onClick={() => setOn(toggleFavorite({ kind, slug }))}
    >
      {on ? labels.remove : labels.add}
    </button>
  )
}
