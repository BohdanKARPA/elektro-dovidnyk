import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProjectRow } from '@/components/ProjectRow'
import { getAuthor, getProjects } from '@/lib/data'
import { getDict, isLang, t } from '@/lib/i18n'

const AUTHOR_SLUG = 'bohdan-karpa'
const GITHUB = 'https://github.com/BohdanKARPA'
const ORCID = 'https://orcid.org/0009-0001-9315-2630'

export async function generateMetadata({ params }: PageProps<'/[lang]/about'>): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return { title: getDict(lang).nav.about, alternates: { canonical: `/${lang}/about` } }
}

const content = {
  uk: {
    intro:
      'Довідник створено як самостійну роботу з дисципліни «Інструментальні засоби веб-технологій» (варіант Headless CMS / JAMstack).',
    how: 'Як влаштовано',
    items: [
      ['Контент', 'зберігається в Sanity — headless CMS. Редактори працюють в адмін-панелі за адресою /studio.'],
      ['Сайт', 'зібраний на Next.js: сторінки генеруються статично і оновлюються за вебхуком, щойно редактор публікує зміни.'],
      ['Форум', 'приймає коментарі через захищений API. Кожен коментар перевіряє AI-модерація, а сумнівні чекають на модератора.'],
      ['Переклад', 'англійської версії робить AI після публікації; редактор може виправити будь-яке поле вручну.'],
    ],
    author: 'Автор',
    authorProjects: 'Проєкти автора',
    publication: 'Публікація',
    paper:
      'Карпа Б.Я., Лашко О.Л. Навчально-дослідна система керування багатокомірковою акумуляторною батареєю з переналаштовуваним алгоритмом індуктивного балансування // Комп’ютерні системи та мережі (НУ «Львівська політехніка»). 2026.',
    paperStatus: 'Статтю подано до журналу, зараз вона на доопрацюванні після рецензії.',
    profiles: 'Профілі',
    skills: 'Напрями',
    skillList: 'STM32, AVR, ESP32 · C/C++ і прошивки · UART, SPI, I²C, RS-485, MQTT · силова електроніка, захист і живлення · Multisim, EasyEDA, Renode, 3D-друк',
    rules: 'Правила форуму',
    rulesText:
      'Пишіть по суті, без реклами й образ. Не публікуйте особисті дані. Коментарі, що порушують правила, не публікуються.',
  },
  en: {
    intro:
      'This reference was built as independent coursework for the “Web Technology Tools” course (Headless CMS / JAMstack track).',
    how: 'How it works',
    items: [
      ['Content', 'lives in Sanity, a headless CMS. Editors work in the admin panel at /studio.'],
      ['The site', 'is built with Next.js: pages are generated statically and refreshed by a webhook as soon as an editor publishes.'],
      ['The forum', 'accepts comments through a protected API. AI moderation checks each one; doubtful ones wait for a moderator.'],
      ['Translation', 'into English is done by AI after publishing; editors can correct any field by hand.'],
    ],
    author: 'Author',
    authorProjects: 'Projects by the author',
    publication: 'Publication',
    paper:
      'Karpa B., Lashko O. A teaching and research management system for a multi-cell battery with a reconfigurable inductive balancing algorithm // Computer Systems and Networks (Lviv Polytechnic National University). 2026. (In Ukrainian.)',
    paperStatus: 'The paper has been submitted to the journal and is being revised after peer review.',
    profiles: 'Profiles',
    skills: 'Areas',
    skillList: 'STM32, AVR, ESP32 · C/C++ and firmware · UART, SPI, I²C, RS-485, MQTT · power electronics, protection and supply · Multisim, EasyEDA, Renode, 3D printing',
    rules: 'Forum rules',
    rulesText: 'Stay on topic, no ads or insults. Do not post personal data. Comments that break the rules are not published.',
  },
}

export default async function AboutPage({ params }: PageProps<'/[lang]/about'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const c = content[lang]
  const [author, projects] = await Promise.all([getAuthor(AUTHOR_SLUG), getProjects()])
  const own = projects.filter((p) => p.author?.slug === AUTHOR_SLUG)
  return (
    <article style={{ maxWidth: 720 }}>
      <h1>{dict.nav.about}</h1>
      <p style={{ fontSize: 'var(--step-1)' }}>{c.intro}</p>
      <h2 style={{ marginTop: 40 }}>{c.how}</h2>
      <table className="specs">
        <tbody>
          {c.items.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {author && (
        <section className="section author" aria-labelledby="author">
          <h2 id="author">{c.author}</h2>
          <p className="author-name">
            <strong>{author.name}</strong>
            {author.role && <span className="dim"> · {t(author.role, lang)}</span>}
          </p>
          {author.bio && <p>{t(author.bio, lang)}</p>}
          <table className="specs">
            <tbody>
              <tr>
                <th scope="row">{c.skills}</th>
                <td>{c.skillList}</td>
              </tr>
              <tr>
                <th scope="row">{c.profiles}</th>
                <td>
                  <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                  {' · '}
                  <a href={ORCID} target="_blank" rel="noopener noreferrer">
                    ORCID 0009-0001-9315-2630
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: 32 }}>{c.publication}</h3>
          <p>{c.paper}</p>
          <p className="dim">{c.paperStatus}</p>

          {own.length > 0 && (
            <>
              <h3 style={{ marginTop: 32 }}>{c.authorProjects}</h3>
              <ul className="project-list covers">
                {own.map((p) => (
                  <ProjectRow key={p._id} p={p} lang={lang} dict={dict} meta="short" />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <h2 style={{ marginTop: 40 }}>{c.rules}</h2>
      <p>{c.rulesText}</p>
    </article>
  )
}
