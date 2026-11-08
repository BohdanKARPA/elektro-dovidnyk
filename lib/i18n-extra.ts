import type { Lang } from './types'

/** UI strings for search, favourites, comparison, calculators and the RSS feed. */
const extra = {
  uk: {
    tools: 'Інструменти',
    searchLabel: 'Пошук по сайту',
    searchPlaceholder: 'Пошук…',
    searchTitle: 'Пошук',
    searchIntro: 'Шукає в компонентах, проєктах і темах форуму.',
    searchButton: 'Знайти',
    searchFound: (n: number) => `Знайдено: ${n}`,
    searchEmpty: 'Нічого не знайдено. Спробуйте іншу назву, виробника або тег.',
    searchShort: 'Введіть щонайменше 2 символи.',
    kind: { component: 'Компонент', project: 'Проєкт', topic: 'Тема форуму' },
    favorites: 'Обране',
    favAdd: '☆ В обране',
    favRemove: '★ В обраному',
    favIntro: 'Компоненти й проєкти, які ви позначили зірочкою. Список зберігається у вашому браузері.',
    favEmpty: 'Поки порожньо. Додайте компонент або проєкт кнопкою «☆ В обране» на його сторінці.',
    favClear: 'Очистити список',
    compare: 'Порівняння',
    compareIntro: 'Характеристики кількох компонентів поруч. Можна порівнювати до 4 компонентів.',
    compareCol: 'Порівняти',
    compareGo: (n: number) => `Порівняти (${n})`,
    compareReset: 'Скинути',
    compareWith: 'Порівняти з іншими',
    compareAdd: 'Додати компонент',
    compareAddButton: 'Додати',
    compareRemove: 'Прибрати',
    compareEmpty: 'Оберіть компоненти в каталозі (колонка «Порівняти») або додайте їх тут.',
    compareParam: 'Параметр',
    compareMax: 'Можна порівнювати не більше 4 компонентів.',
    rss: 'RSS',
    rssTitle: 'Нові проєкти й теми форуму',
    toTop: 'Нагору',
    scopeLabel: 'Осцилограма: ШІМ-сигнал і синусоїда',
  },
  en: {
    tools: 'Tools',
    searchLabel: 'Site search',
    searchPlaceholder: 'Search…',
    searchTitle: 'Search',
    searchIntro: 'Searches components, projects and forum topics.',
    searchButton: 'Search',
    searchFound: (n: number) => `Found: ${n}`,
    searchEmpty: 'Nothing found. Try another name, manufacturer or tag.',
    searchShort: 'Type at least 2 characters.',
    kind: { component: 'Component', project: 'Project', topic: 'Forum topic' },
    favorites: 'Favourites',
    favAdd: '☆ Add to favourites',
    favRemove: '★ In favourites',
    favIntro: 'Components and projects you starred. The list is stored in your browser.',
    favEmpty: 'Nothing here yet. Use the “☆ Add to favourites” button on a component or project page.',
    favClear: 'Clear the list',
    compare: 'Compare',
    compareIntro: 'Specifications of several parts side by side. Up to 4 parts can be compared.',
    compareCol: 'Compare',
    compareGo: (n: number) => `Compare (${n})`,
    compareReset: 'Reset',
    compareWith: 'Compare with others',
    compareAdd: 'Add a part',
    compareAddButton: 'Add',
    compareRemove: 'Remove',
    compareEmpty: 'Pick parts in the catalogue (the “Compare” column) or add them here.',
    compareParam: 'Parameter',
    compareMax: 'Up to 4 parts can be compared.',
    rss: 'RSS',
    rssTitle: 'New projects and forum topics',
    toTop: 'Back to top',
    scopeLabel: 'Oscilloscope trace: a PWM signal and a sine wave',
  },
}

export type ExtraDict = (typeof extra)['uk']
export function getExtraDict(lang: Lang): ExtraDict {
  return extra[lang]
}

/** Labels are passed to client components, so they must be plain strings (no functions). */
export function clientExtra(lang: Lang) {
  const { searchFound: _f, compareGo: _g, ...rest } = extra[lang]
  void _f
  void _g
  return rest
}
export type ClientExtra = ReturnType<typeof clientExtra>
