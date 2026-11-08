import type { Lang, Localized } from './types'

export const LANGS: Lang[] = ['uk', 'en']
export const DEFAULT_LANG: Lang = 'uk'

export function isLang(value: string): value is Lang {
  return (LANGS as string[]).includes(value)
}

/** Pick the requested translation, falling back to Ukrainian (the source language). */
export function t(field: Localized, lang: Lang): string {
  if (!field) return ''
  return field[lang] || field.uk || ''
}

const dict = {
  uk: {
    siteName: 'Довідник електроніки',
    tagline: 'Компоненти, DIY-проєкти та форум для тих, хто паяє',
    nav: { home: 'Головна', components: 'Компоненти', projects: 'Проєкти', forum: 'Форум', about: 'Про сайт' },
    heroTitle: 'Від даташиту до працюючої плати',
    heroText:
      'Короткі картки компонентів з ключовими параметрами, покрокові DIY-проєкти та обговорення з людьми, які вже наступили на ті самі граблі.',
    browse: 'Переглянути компоненти',
    toForum: 'Поставити питання',
    stats: { components: 'компонентів', projects: 'проєктів', topics: 'тем на форумі' },
    latestProjects: 'Нові проєкти',
    categories: 'Категорії',
    all: 'Усі',
    search: 'Пошук за назвою, тегом або виробником…',
    nothing: 'Нічого не знайдено.',
    specs: 'Характеристики',
    package: 'Корпус',
    price: 'Орієнтовна ціна',
    uah: 'грн',
    manufacturer: 'Виробник',
    datasheet: 'Відкрити datasheet',
    usedIn: 'Використовується в проєктах',
    difficulty: { easy: 'Легко', medium: 'Середньо', hard: 'Складно' },
    hours: 'год',
    steps: 'Кроки',
    parts: 'Компоненти',
    comments: 'Коментарі',
    noComments: 'Ще немає коментарів. Будьте першим.',
    leaveComment: 'Залишити коментар',
    name: "Ім'я",
    message: 'Текст',
    send: 'Надіслати',
    sending: 'Надсилаємо…',
    sentPending: 'Дякуємо! Коментар з’явиться після модерації.',
    sentApproved: 'Дякуємо! Коментар опубліковано.',
    error: 'Не вдалося надіслати. Спробуйте пізніше.',
    tooMany: 'Забагато коментарів поспіль. Зачекайте 10 хвилин і спробуйте знову.',
    invalid: "Перевірте поля: ім'я від 2 символів, текст від 3 до 2000.",
    forumIntro: 'Питання про компоненти та схеми. Відповіді проходять модерацію — автоматичну (AI) і ручну.',
    pinned: 'Закріплено',
    replies: 'відповідей',
    related: "Пов'язаний компонент",
    back: '← Назад',
    demo: 'Демо-режим: дані з data/seed.json. Підключіть Sanity, щоб редагувати контент.',
    notFound: 'Сторінку не знайдено',
    toHome: 'На головну',
    admin: 'Адмін-панель',
  },
  en: {
    siteName: 'Electronics Reference',
    tagline: 'Components, DIY projects and a forum for people who solder',
    nav: { home: 'Home', components: 'Components', projects: 'Projects', forum: 'Forum', about: 'About' },
    heroTitle: 'From datasheet to a working board',
    heroText:
      'Short component cards with the key parameters, step-by-step DIY projects and discussions with people who have already stepped on the same rakes.',
    browse: 'Browse components',
    toForum: 'Ask a question',
    stats: { components: 'components', projects: 'projects', topics: 'forum topics' },
    latestProjects: 'Latest projects',
    categories: 'Categories',
    all: 'All',
    search: 'Search by name, tag or manufacturer…',
    nothing: 'Nothing found.',
    specs: 'Specifications',
    package: 'Package',
    price: 'Approx. price',
    uah: 'UAH',
    manufacturer: 'Manufacturer',
    datasheet: 'Open datasheet',
    usedIn: 'Used in projects',
    difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    hours: 'h',
    steps: 'Steps',
    parts: 'Parts',
    comments: 'Comments',
    noComments: 'No comments yet. Be the first.',
    leaveComment: 'Leave a comment',
    name: 'Name',
    message: 'Message',
    send: 'Send',
    sending: 'Sending…',
    sentPending: 'Thanks! Your comment will appear after moderation.',
    sentApproved: 'Thanks! Your comment is published.',
    error: 'Could not send. Please try again later.',
    tooMany: 'Too many comments in a row. Wait 10 minutes and try again.',
    invalid: 'Check the fields: name at least 2 characters, message 3 to 2000.',
    forumIntro: 'Questions about parts and circuits. Replies are moderated — automatically (AI) and by hand.',
    pinned: 'Pinned',
    replies: 'replies',
    related: 'Related component',
    back: '← Back',
    demo: 'Demo mode: data from data/seed.json. Connect Sanity to edit content.',
    notFound: 'Page not found',
    toHome: 'Go home',
    admin: 'Admin panel',
  },
} as const

export type Dict = (typeof dict)['uk']
export function getDict(lang: Lang): Dict {
  return dict[lang] as unknown as Dict
}

export function formatDate(iso: string | undefined, lang: Lang): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { dateStyle: 'medium' }).format(new Date(iso))
}
