import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDict, isLang } from '@/lib/i18n'

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
    rules: 'Forum rules',
    rulesText: 'Stay on topic, no ads or insults. Do not post personal data. Comments that break the rules are not published.',
  },
}

export default async function AboutPage({ params }: PageProps<'/[lang]/about'>) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const dict = getDict(lang)
  const c = content[lang]
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
      <h2 style={{ marginTop: 40 }}>{c.rules}</h2>
      <p>{c.rulesText}</p>
    </article>
  )
}
