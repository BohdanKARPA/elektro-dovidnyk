'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Lang } from '@/lib/types'
import type { Dict } from '@/lib/i18n'
import { packageLabel } from '@/lib/part-kind'
import { PartRender } from './PartRender'

const MAX_COMPARE = 4

export interface GuideRow {
  id: string
  name: string
  slug: string
  manufacturer?: string
  summary: string
  category?: string
  categorySlug?: string
  package?: string
  /** A ready board or module rather than a bare chip. */
  board?: boolean
  priceUah?: number
  tags?: string[]
}

export function ComponentGuide({
  rows,
  categories,
  lang,
  dict,
  initialCategory,
  compareLabels,
}: {
  rows: GuideRow[]
  categories: { slug: string; title: string }[]
  lang: Lang
  dict: Dict
  initialCategory?: string
  compareLabels: { col: string; reset: string; max: string; only: string }
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | undefined>(initialCategory)
  const [picked, setPicked] = useState<string[]>([])
  const toggle = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : p.length >= MAX_COMPARE ? p : [...p, slug]))
  // Parts are compared within one category: the first pick sets it.
  const pickedCat = picked.length ? rows.find((r) => r.slug === picked[0])?.categorySlug : undefined
  const pickedCatTitle = picked.length ? rows.find((r) => r.slug === picked[0])?.category : undefined
  const canPick = (r: GuideRow) => picked.includes(r.slug) || (picked.length < MAX_COMPARE && (!picked.length || r.categorySlug === pickedCat))

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
              <th scope="col">{packageLabel(visible.map((r) => Boolean(r.board)), lang)}</th>
              <th scope="col" className="num">
                {dict.price}
              </th>
              <th scope="col" className="cmp">
                {compareLabels.col}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td className="pn">
                  <span className="pn-row">
                    <span className="thumb">
                      <PartRender name={r.name} pkg={r.package} manufacturer={r.manufacturer} />
                    </span>
                    <span>
                      <Link href={`/${lang}/components/${r.slug}`}>{r.name}</Link>
                      <span className="dim">{r.manufacturer}</span>
                    </span>
                  </span>
                </td>
                <td>
                  {r.summary}
                  <div className="dim">{r.category}</div>
                </td>
                <td className="dim">{r.package}</td>
                <td className="num">{r.priceUah ? `≈ ${r.priceUah} ${dict.uah}` : '—'}</td>
                <td className="cmp">
                  <label title={!canPick(r) && picked.length < MAX_COMPARE ? `${compareLabels.only} «${pickedCatTitle}»` : undefined}>
                    <input
                      type="checkbox"
                      checked={picked.includes(r.slug)}
                      disabled={!canPick(r)}
                      onChange={() => toggle(r.slug)}
                      aria-label={`${compareLabels.col}: ${r.name}`}
                    />
                    <span className="cmp-text">{compareLabels.col}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {picked.length > 0 && (
        <div className="compare-bar" role="region" aria-label={compareLabels.col}>
          <span>
            {picked.length >= MAX_COMPARE ? compareLabels.max : picked.map((s) => rows.find((r) => r.slug === s)?.name).join(', ')}
            {pickedCatTitle && (
              <span className="dim">
                {' '}
                · {compareLabels.only} «{pickedCatTitle}»
              </span>
            )}
          </span>
          <span className="compare-bar-actions">
            <button type="button" className="btn ghost small" onClick={() => setPicked([])}>
              {compareLabels.reset}
            </button>
            <Link className="btn small" href={`/${lang}/compare?items=${picked.join(',')}`} aria-disabled={picked.length < 2}>
              {compareLabels.col} ({picked.length})
            </Link>
          </span>
        </div>
      )}
    </>
  )
}
