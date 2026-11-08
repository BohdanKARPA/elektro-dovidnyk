import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/Comments'
import { Difficulty } from '@/components/Difficulty'
import { getComponent, getProjectsUsing, getSlugs } from '@/lib/data'
import { getDict, isLang, LANGS, t } from '@/lib/i18n'
import { imageUrl } from '@/lib/sanity'

export const revalidate = 3600

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
          {img && (
            <figure className="figure">
              <Image src={img} alt={c.name} width={900} height={600} sizes="(max-width: 900px) 100vw, 700px" />
            </figure>
          )}
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
              <ul className="project-list">
                {projects.map((p) => (
                  <li key={p._id}>
                    <Link href={`/${lang}/projects/${p.slug}`}>
                      <h3>{t(p.title, lang)}</h3>
                      <p>{t(p.summary, lang)}</p>
                      <span className="side">
                        <Difficulty value={p.difficulty} dict={dict} />
                      </span>
                    </Link>
                  </li>
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
          {c.datasheetUrl && (
            <p style={{ marginTop: 20 }}>
              <a className="btn ghost" href={c.datasheetUrl} target="_blank" rel="noopener noreferrer">
                {dict.datasheet}
              </a>
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
