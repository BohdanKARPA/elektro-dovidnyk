import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/Comments'
import { PartRender } from '@/components/PartRender'
import { PartStage } from '@/components/PartStage'
import { ProjectRow } from '@/components/ProjectRow'
import { FavoriteButton } from '@/components/FavoriteButton'
import { getComponent, getProjectsUsing, getSlugs } from '@/lib/data'
import { getDict, isLang, LANGS, t } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'
import { imageUrl } from '@/lib/sanity'

export const revalidate = 3600

/** Exact LCSC part when the editor set one, otherwise a catalogue search by part name. */
const lcscUrl = (c: { name: string; lcscPart?: string }) =>
  c.lcscPart && /^C\d{1,9}$/.test(c.lcscPart)
    ? `https://www.lcsc.com/product-detail/${c.lcscPart}.html`
    : `https://www.lcsc.com/search?q=${encodeURIComponent(c.name)}`

export async function generateStaticParams() {
  const slugs = await getSlugs('component')
  return LANGS.flatMap((lang) => slugs.map((slug) => ({ lang, slug })))
}

export async function generateMetadata({ params }: PageProps<'/[lang]/components/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLang(lang)) return {}
  const c = await getComponent(slug)
  if (!c) return {}
  const description = t(c.seoDescription, lang) || t(c.summary, lang)
  const img = imageUrl(c.image, 1200)
  return {
    title: c.name,
    description,
    alternates: { canonical: `/${lang}/components/${slug}`, languages: { uk: `/uk/components/${slug}`, en: `/en/components/${slug}` } },
    openGraph: { title: c.name, description, ...(img && { images: [img] }) },
  }
}

export default async function ComponentPage({ params }: PageProps<'/[lang]/components/[slug]'>) {
  const { lang, slug } = await params
  if (!isLang(lang)) notFound()
  const c = await getComponent(slug)
  if (!c) notFound()
  const dict = getDict(lang)
  const x = getExtraDict(lang)
  const projects = await getProjectsUsing(c._id)
  const img = imageUrl(c.image, 900)

  // Structured data for search engines (schema.org/Product).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: c.name,
    description: t(c.summary, lang),
    brand: c.manufacturer ? { '@type': 'Brand', name: c.manufacturer } : undefined,
    category: t(c.category?.title, lang),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/components`}>{dict.nav.components}</Link>
        {c.category && (
          <>
            {' / '}
            <Link href={`/${lang}/components?category=${c.category.slug}`}>{t(c.category.title, lang)}</Link>
          </>
        )}
      </nav>
      <div className="detail">
        <article>
          <h1>{c.name}</h1>
          <div className="meta-line">
            {c.manufacturer && <span>{c.manufacturer}</span>}
            {c.package && <span>{c.package}</span>}
            {c.priceUah ? (
              <span>
                ≈ {c.priceUah} {dict.uah}
              </span>
            ) : null}
          </div>
          <div className="item-actions">
            <FavoriteButton kind="component" slug={c.slug} labels={{ add: x.favAdd, remove: x.favRemove }} />
            <Link className="btn ghost small" href={`/${lang}/compare?items=${c.slug}`}>
              {x.compareWith}
            </Link>
          </div>
          <PartStage caption={img ? undefined : `${c.package ?? ''}`.trim() || undefined}>
            {img ? (
              <Image src={img} alt={c.name} width={900} height={600} sizes="(max-width: 900px) 100vw, 700px" />
            ) : (
              <PartRender name={c.name} pkg={c.package} manufacturer={c.manufacturer} title={`${c.name}, ${c.package ?? ''}`} />
            )}
          </PartStage>
          <p style={{ fontSize: 'var(--step-1)' }}>{t(c.summary, lang)}</p>
          <div className="prose">
            {t(c.description, lang)
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
          {c.tags && c.tags.length > 0 && (
            <ul className="tags" aria-label="Tags">
              {c.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}

          {projects.length > 0 && (
            <section className="section">
              <h2>{dict.usedIn}</h2>
              <ul className="project-list covers">
                {projects.map((p) => (
                  <ProjectRow key={p._id} p={p} lang={lang} dict={dict} meta="short" />
                ))}
              </ul>
            </section>
          )}

          <Comments targetId={c._id} lang={lang} dict={dict} />
        </article>

        <aside>
          {c.specs && c.specs.length > 0 && (
            <table className="specs">
              <caption>{dict.specs}</caption>
              <tbody>
                {c.specs.map((s) => (
                  <tr key={s._key}>
                    <th scope="row">{s.label}</th>
                    <td>{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="source-links">
            {c.datasheetUrl && (
              <a className="btn ghost" href={c.datasheetUrl} target="_blank" rel="noopener noreferrer">
                {dict.datasheet}
              </a>
            )}
            <a className="btn ghost" href={lcscUrl(c)} target="_blank" rel="noopener noreferrer">
              {x.lcsc}
            </a>
            {!img && <p className="dim">{x.lcscNote}</p>}
          </div>
        </aside>
      </div>
    </>
  )
}
