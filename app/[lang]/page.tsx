import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BoardLamp } from '@/components/BoardLamp'
import { CategoryIcon } from '@/components/CategoryIcon'
import { CountUp } from '@/components/CountUp'
import { HeroBoard } from '@/components/HeroBoard'
import { PartRender } from '@/components/PartRender'
import { ProjectRow } from '@/components/ProjectRow'
import { getCategories, getComponents, getProjects, getStats } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'
import type { ComponentDoc } from '@/lib/types'

export const revalidate = 3600

/** Parts shown in the tray: one of each package family, so the renders differ. */
const FEATURED = ['stm32f407', 'esp32c6', 'ina238', 'irlz44n', 'bme280', 'uno-q', 'max485', 'lm2596']

function pickFeatured(all: ComponentDoc[]): ComponentDoc[] {
  const chosen = FEATURED.map((s) => all.find((c) => c.slug === s)).filter((c): c is ComponentDoc => Boolean(c))
  for (const c of all) if (chosen.length < 8 && !chosen.includes(c)) chosen.push(c)
  return chosen.slice(0, 8)
}

const copy = {
  uk: {
    tray: 'Касетниця',
    trayText: 'Компоненти, які найчастіше трапляються в наших проєктах. Повний перелік — у каталозі.',
    toCatalog: 'Увесь каталог',
    board: 'Друкована плата: мікроконтролер U1 з’єднаний доріжками з датчиком, ключем, приймачем RS-485 і монітором струму',
  },
  en: {
    tray: 'Parts drawer',
    trayText: 'The parts that show up in our projects most often. The full list is in the catalogue.',
    toCatalog: 'Full catalogue',
    board: 'Printed circuit board: microcontroller U1 routed to a sensor, a switch, an RS-485 transceiver and a current monitor',
  },
}

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const c = copy[lang]
  const [stats, categories, projects, components] = await Promise.all([getStats(), getCategories(), getProjects(), getComponents()])
  const featured = pickFeatured(components)

  return (
    <>
      <BoardLamp className="hero-pcb">
        <div className="hero-copy">
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
              <strong>
                <CountUp value={stats.components} />
              </strong>
              {dict.stats.components}
            </li>
            <li>
              <strong>
                <CountUp value={stats.projects} />
              </strong>
              {dict.stats.projects}
            </li>
            <li>
              <strong>
                <CountUp value={stats.topics} />
              </strong>
              {dict.stats.topics}
            </li>
          </ul>
        </div>
        <HeroBoard label={c.board} />
      </BoardLamp>

      <section className="section" aria-labelledby="tray">
        <div className="section-head">
          <h2 id="tray">{c.tray}</h2>
          <Link href={`/${lang}/components`}>{c.toCatalog}</Link>
        </div>
        <p className="lede">{c.trayText}</p>
        <ul className="tray">
          {featured.map((p) => (
            <li key={p._id}>
              <Link href={`/${lang}/components/${p.slug}`}>
                <span className="tray-shot">
                  <PartRender name={p.name} pkg={p.package} manufacturer={p.manufacturer} />
                </span>
                <span className="tray-name">{p.name}</span>
                <span className="tray-meta">{t(p.category?.title, lang)}</span>
                {p.priceUah ? (
                  <span className="tray-price">
                    ≈ {p.priceUah} {dict.uah}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="cats">
        <h2 id="cats">{dict.categories}</h2>
        <div className="cats">
          {categories.map((cat) => (
            <Link key={cat._id} className="cat" href={`/${lang}/components?category=${cat.slug}`}>
              <span className="cat-name">
                <CategoryIcon name={cat.icon} />
                {t(cat.title, lang)}
              </span>
              <span className="cat-count">{t(cat.description, lang)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="latest">
        <div className="section-head">
          <h2 id="latest">{dict.latestProjects}</h2>
          <Link href={`/${lang}/projects`}>{dict.nav.projects}</Link>
        </div>
        <ul className="project-list covers">
          {projects.slice(0, 3).map((p) => (
            <ProjectRow key={p._id} p={p} lang={lang} dict={dict} meta="short" />
          ))}
        </ul>
      </section>
    </>
  )
}
