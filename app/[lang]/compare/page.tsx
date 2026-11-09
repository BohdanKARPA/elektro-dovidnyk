import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PartRender } from '@/components/PartRender'
import { getComponent, getComponents } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'
import { isBoard, packageLabel } from '@/lib/part-kind'
import type { ComponentDoc } from '@/lib/types'

const MAX = 4
const SLUG = /^[a-z0-9-]{1,80}$/

export async function generateMetadata({ params }: PageProps<'/[lang]/compare'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return { title: getExtraDict(lang).compare, robots: { index: false, follow: true } }
}

/** Parse ?items=a,b,c (+ optional ?add=d from the "add" form) into a clean, de-duplicated list of slugs. */
function parseItems(sp: Record<string, string | string[] | undefined>): { slugs: string[]; overflow: boolean } {
  const raw = [sp.items, sp.add].flatMap((v) => (Array.isArray(v) ? v : v ? [v] : [])).flatMap((v) => v.split(','))
  const slugs = [...new Set(raw.map((s) => s.trim()).filter((s) => SLUG.test(s)))]
  return { slugs: slugs.slice(0, MAX), overflow: slugs.length > MAX }
}

export default async function ComparePage({ params, searchParams }: PageProps<'/[lang]/compare'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const x = getExtraDict(lang)
  const { slugs, overflow } = parseItems(await searchParams)

  const [found, all] = await Promise.all([Promise.all(slugs.map((s) => getComponent(s))), getComponents()])
  // Only parts of one category are compared (an MCU next to a current sensor tells nothing):
  // the first part sets the category, parts of other categories are left out with a note.
  const valid = found.filter((c): c is ComponentDoc => Boolean(c))
  const catSlug = valid[0]?.category?.slug
  const items = valid.filter((c) => c.category?.slug === catSlug)
  const dropped = valid.filter((c) => c.category?.slug !== catSlug)
  const category = items[0]?.category
  const current = items.map((c) => c.slug)
  const href = (list: string[]) => (list.length ? `/${lang}/compare?items=${list.join(',')}` : `/${lang}/compare`)

  // Union of spec labels in first-seen order, so every parameter gets one row.
  const labels: string[] = []
  for (const c of items) for (const s of c.specs ?? []) if (!labels.includes(s.label)) labels.push(s.label)

  const rows: { label: string; values: string[] }[] = [
    { label: dict.manufacturer, values: items.map((c) => c.manufacturer ?? '—') },
    { label: packageLabel(items.map(isBoard), lang), values: items.map((c) => c.package ?? '—') },
    { label: dict.price, values: items.map((c) => (c.priceUah ? `≈ ${c.priceUah} ${dict.uah}` : '—')) },
    ...labels.map((label) => ({ label, values: items.map((c) => c.specs?.find((s) => s.label === label)?.value ?? '—') })),
  ]
  const candidates = all.filter((c) => !current.includes(c.slug) && (!items.length || c.category?.slug === catSlug))
  // Before the first pick, group the choice by category so it is clear what goes with what.
  const groups = new Map<string, { title: string; parts: ComponentDoc[] }>()
  for (const c of candidates) {
    const key = c.category?.slug ?? '-'
    const g = groups.get(key) ?? { title: t(c.category?.title, lang) || '—', parts: [] }
    g.parts.push(c)
    groups.set(key, g)
  }
  const option = (c: ComponentDoc) => (
    <option key={c._id} value={c.slug}>
      {c.name}
      {c.manufacturer ? ` (${c.manufacturer})` : ''}
    </option>
  )

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/components`}>{dict.nav.components}</Link>
      </nav>
      <h1>{x.compare}</h1>
      <p className="lede">{x.compareIntro}</p>
      {overflow && <p className="form-note err">{x.compareMax}</p>}
      {category && (
        <p className="compare-cat">
          {x.compareCategory}: <strong>{t(category.title, lang)}</strong>
          <span className="dim"> · {x.compareSameCategory}</span>
        </p>
      )}
      {dropped.length > 0 && (
        <p className="form-note err">
          {x.compareDropped}: {dropped.map((c) => c.name).join(', ')}. {x.compareSameCategory}
        </p>
      )}

      {items.length === 0 ? (
        <p className="lede">{x.compareEmpty}</p>
      ) : (
        <div className="compare-scroll">
          <table className="guide compare">
            <thead>
              <tr>
                <th scope="col">{x.compareParam}</th>
                {items.map((c) => (
                  <th key={c._id} scope="col">
                    <span className="compare-shot">
                      <PartRender name={c.name} pkg={c.package} manufacturer={c.manufacturer} />
                    </span>
                    <Link className="pn-link" href={`/${lang}/components/${c.slug}`}>
                      {c.name}
                    </Link>
                    <Link className="remove" href={href(current.filter((s) => s !== c.slug))} aria-label={`${x.compareRemove}: ${c.name}`}>
                      {x.compareRemove}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={items[i]._id}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && items.length < MAX && candidates.length === 0 && <p className="lede">{x.compareNoMore}</p>}
      {items.length < MAX && candidates.length > 0 && (
        <form className="toolbar" action={`/${lang}/compare`} method="get">
          {current.length > 0 && <input type="hidden" name="items" value={current.join(',')} />}
          <label className="inline-label">
            {x.compareAdd}
            <select name="add" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {items.length
                ? candidates.map(option)
                : [...groups.values()].map((g) => (
                    <optgroup key={g.title} label={g.title}>
                      {g.parts.map(option)}
                    </optgroup>
                  ))}
            </select>
          </label>
          <button className="btn" type="submit">
            {x.compareAddButton}
          </button>
        </form>
      )}
    </>
  )
}
