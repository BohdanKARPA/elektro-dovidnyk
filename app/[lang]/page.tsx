import Link from 'next/link'
import { HeroBoard } from '@/components/HeroBoard'
import { CategoryIcon } from '@/components/CategoryIcon'
import { Difficulty } from '@/components/Difficulty'
import { getCategories, getProjects, getStats } from '@/lib/data'
import { getDict, isLang, t, formatDate } from '@/lib/i18n'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const [stats, categories, projects] = await Promise.all([getStats(), getCategories(), getProjects()])

  return (
    <>
      <section className="hero">
        <div>
          <h1>{dict.heroTitle}</h1>
          <p>{dict.heroText}</p>
          <div className="hero-actions">
            <Link className="btn" href={`/${lang}/components`}>
              {dict.browse}
            </Link>
            <Link className="btn ghost" href={`/${lang}/forum`}>
              {dict.toForum}
            </Link>
          </div>
          <ul className="stats">
            <li>
              <strong>{stats.components}</strong>
              {dict.stats.components}
            </li>
            <li>
              <strong>{stats.projects}</strong>
              {dict.stats.projects}
            </li>
            <li>
              <strong>{stats.topics}</strong>
              {dict.stats.topics}
            </li>
          </ul>
        </div>
        <HeroBoard label={lang === 'uk' ? 'Схема: мікроконтролер з’єднаний доріжками з чотирма периферійними пристроями' : 'Diagram: a microcontroller routed to four peripherals'} />
      </section>

      <section className="section" aria-labelledby="cats">
        <h2 id="cats">{dict.categories}</h2>
        <div className="cats">
          {categories.map((c) => (
            <Link key={c._id} className="cat" href={`/${lang}/components?category=${c.slug}`}>
              <span className="cat-name">
                <CategoryIcon name={c.icon} />
                {t(c.title, lang)}
              </span>
              <span className="cat-count">{t(c.description, lang)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="latest">
        <div className="section-head">
          <h2 id="latest">{dict.latestProjects}</h2>
          <Link href={`/${lang}/projects`}>{dict.nav.projects}</Link>
        </div>
        <ul className="project-list">
          {projects.slice(0, 3).map((p) => (
            <li key={p._id}>
              <Link href={`/${lang}/projects/${p.slug}`}>
                <h3>{t(p.title, lang)}</h3>
                <p>{t(p.summary, lang)}</p>
                <span className="side">
                  <Difficulty value={p.difficulty} dict={dict} />
                  <span>{formatDate(p.publishedAt, lang)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
