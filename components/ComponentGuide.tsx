'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Lang } from '@/lib/types'
import type { Dict } from '@/lib/i18n'

export interface GuideRow {
  id: string
  name: string
  slug: string
  manufacturer?: string
  summary: string
  category?: string
  categorySlug?: string
  package?: string
  priceUah?: number
  tags?: string[]
}

export function ComponentGuide({
  rows,
  categories,
  lang,
  dict,
  initialCategory,
}: {
  rows: GuideRow[]
  categories: { slug: string; title: string }[]
  lang: Lang
  dict: Dict
  initialCategory?: string
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | undefined>(initialCategory)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (cat && r.categorySlug !== cat) return false
      if (!q) return true
      return [r.name, r.manufacturer, r.summary, ...(r.tags ?? [])].some((s) => s?.toLowerCase().includes(q))
    })
  }, [rows, query, cat])

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.search}
          aria-label={dict.search}
          maxLength={80}
        />
        <div className="chips" role="group" aria-label={dict.categories}>
          <button type="button" className="chip" aria-pressed={!cat} onClick={() => setCat(undefined)}>
            {dict.all}
          </button>
          {categories.map((c) => (
            <button key={c.slug} type="button" className="chip" aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)}>
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="lede">{dict.nothing}</p>
      ) : (
        <table className="guide">
          <thead>
            <tr>
              <th scope="col">{lang === 'uk' ? 'Компонент' : 'Part'}</th>
              <th scope="col">{lang === 'uk' ? 'Опис' : 'Description'}</th>
              <th scope="col">{dict.package}</th>
              <th scope="col" className="num">
                {dict.price}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td className="pn">
                  <Link href={`/${lang}/components/${r.slug}`}>{r.name}</Link>
                  <div className="dim">{r.manufacturer}</div>
                </td>
                <td>
                  {r.summary}
                  <div className="dim">{r.category}</div>
                </td>
                <td className="dim">{r.package}</td>
                <td className="num">{r.priceUah ? `≈ ${r.priceUah} ${dict.uah}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
