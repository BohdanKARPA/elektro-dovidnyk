import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/Comments'
import { Difficulty } from '@/components/Difficulty'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ProjectCover } from '@/components/ProjectCover'
import { getProject, getSlugs } from '@/lib/data'
import { formatDate, getDict, isLang, LANGS, t } from '@/lib/i18n'
import { getExtraDict } from '@/lib/i18n-extra'
import { imageUrl } from '@/lib/sanity'

export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = await getSlugs('project')
  return LANGS.flatMap((lang) => slugs.map((slug) => ({ lang, slug })))
}

export async function generateMetadata({ params }: PageProps<'/[lang]/projects/[slug]'>): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLang(lang)) return {}
  const p = await getProject(slug)
  if (!p) return {}
  const title = t(p.title, lang)
  const description = t(p.seoDescription, lang) || t(p.summary, lang)
  return {
    title,
    description,
    alternates: { canonical: `/${lang}/projects/${slug}`, languages: { uk: `/uk/projects/${slug}`, en: `/en/projects/${slug}` } },
    openGraph: { title, description, type: 'article', publishedTime: p.publishedAt },
  }
}

export default async function ProjectPage({ params }: PageProps<'/[lang]/projects/[slug]'>) {
  const { lang, slug } = await params
  if (!isLang(lang)) notFound()
  const p = await getProject(slug)
  if (!p) notFound()
  const dict = getDict(lang)
  const x = getExtraDict(lang)
  const cover = imageUrl(p.cover, 1200)

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumbs">
        <Link href={`/${lang}/projects`}>{dict.nav.projects}</Link>
      </nav>
      <div className="detail">
        <article>
          <h1>{t(p.title, lang)}</h1>
          <div className="meta-line">
            <span>
              <Difficulty value={p.difficulty} dict={dict} />
            </span>
            {p.durationHours ? (
              <span>
                {p.durationHours} {dict.hours}
              </span>
            ) : null}
            {(p.author?.name || p.submittedByName) && <span>{p.author?.name ?? p.submittedByName}</span>}
            <span>{formatDate(p.publishedAt, lang)}</span>
          </div>
          <div className="item-actions">
            <FavoriteButton kind="project" slug={p.slug} labels={{ add: x.favAdd, remove: x.favRemove }} />
          </div>
          <figure className="figure cover-figure">
            {cover ? (
              <Image src={cover} alt="" width={1200} height={675} sizes="(max-width: 900px) 100vw, 700px" priority />
            ) : (
              <ProjectCover parts={p.components} />
            )}
          </figure>
          <p style={{ fontSize: 'var(--step-1)' }}>{t(p.summary, lang)}</p>

          <h2 style={{ marginTop: 40 }}>{dict.steps}</h2>
          <ol className="steps">
            {(p.steps ?? []).map((s) => {
              const img = imageUrl(s.image, 900)
              return (
                <li key={s._key}>
                  <h3>{t(s.title, lang)}</h3>
                  <p style={{ whiteSpace: 'pre-line' }}>{t(s.text, lang)}</p>
                  {img && (
                    <figure className="figure">
                      <Image src={img} alt={t(s.title, lang)} width={900} height={600} sizes="(max-width: 900px) 100vw, 640px" />
                    </figure>
                  )}
                </li>
              )
            })}
          </ol>

          <Comments targetId={p._id} lang={lang} dict={dict} />
        </article>

        <aside>
          {p.components && p.components.length > 0 && (
            <table className="specs">
              <caption>{dict.parts}</caption>
              <tbody>
                {p.components.map((c) => (
                  <tr key={c._id}>
                    <th scope="row">
                      <Link href={`/${lang}/components/${c.slug}`}>{c.name}</Link>
                    </th>
                    <td>{t(c.category?.title, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>
      </div>
    </>
  )
}
