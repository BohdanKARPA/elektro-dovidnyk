import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProjectRow } from '@/components/ProjectRow'
import { getProjects } from '@/lib/data'
import { getDict, isLang } from '@/lib/i18n'
import { getSubmitDict } from '@/lib/i18n-submit'
import Link from 'next/link'

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
      <div className="section-head">
        <h1>{dict.nav.projects}</h1>
        <Link className="btn ghost" href={`/${lang}/projects/new`}>
          + {getSubmitDict(lang).addProject}
        </Link>
      </div>
      <p className="lede">
        {lang === 'uk'
          ? 'Покрокові збірки з переліком компонентів, часом на виконання і рівнем складності.'
          : 'Step-by-step builds with a parts list, time estimate and difficulty level.'}
      </p>
      <ul className="project-list covers">
        {projects.map((p) => (
          <ProjectRow key={p._id} p={p} lang={lang} dict={dict} />
        ))}
      </ul>
    </>
  )
}
