import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Difficulty } from '@/components/Difficulty'
import { getProjects } from '@/lib/data'
import { formatDate, getDict, isLang, t } from '@/lib/i18n'

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps<'/[lang]/projects'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return { title: getDict(lang).nav.projects, alternates: { canonical: `/${lang}/projects` } }
}

export default async function ProjectsPage({ params }: PageProps<'/[lang]/projects'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const projects = await getProjects()

  return (
    <>
      <h1>{dict.nav.projects}</h1>
      <p className="lede">
        {lang === 'uk'
          ? 'Покрокові збірки з переліком компонентів, часом на виконання і рівнем складності.'
          : 'Step-by-step builds with a parts list, time estimate and difficulty level.'}
      </p>
      <ul className="project-list">
        {projects.map((p) => (
          <li key={p._id}>
            <Link href={`/${lang}/projects/${p.slug}`}>
              <h3>{t(p.title, lang)}</h3>
              <p>{t(p.summary, lang)}</p>
              <span className="side">
                <Difficulty value={p.difficulty} dict={dict} />
                {p.durationHours ? (
                  <span>
                    {p.durationHours} {dict.hours}
                  </span>
                ) : null}
                <span>{formatDate(p.publishedAt, lang)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
