import { defineArrayMember, defineField, defineType } from 'sanity'

const aiFields = [
  defineField({
    name: 'aiTranslate',
    title: 'AI: перекласти на англійську після публікації',
    description: 'Порожні англійські поля заповнить OpenAI через вебхук /api/ai.',
    type: 'boolean',
    initialValue: true,
    group: 'ai',
  }),
  defineField({
    name: 'seoDescription',
    title: 'SEO-опис',
    description: 'Якщо залишити порожнім — AI згенерує його після публікації (до 160 символів).',
    type: 'localeString',
    group: 'ai',
  }),
]

const groups = [
  { name: 'content', title: 'Контент', default: true },
  { name: 'ai', title: 'AI та SEO' },
  { name: 'review', title: 'Публікація' },
]

/**
 * Components and projects can be submitted by site users. A submission keeps
 * its author, the AI review and a status; only "published" (or no status, for
 * editor-made documents) is shown on the site.
 */
const submissionFields = [
  defineField({
    name: 'status',
    title: 'Статус',
    type: 'string',
    group: 'review',
    options: { list: [{ title: 'Опубліковано', value: 'published' }, { title: 'Чекає перевірки', value: 'pending' }, { title: 'Потребує доопрацювання', value: 'changes' }, { title: 'Відхилено', value: 'rejected' }], layout: 'radio' },
    initialValue: 'published',
  }),
  defineField({ name: 'submittedBy', title: 'Подав користувач', type: 'reference', to: [{ type: 'siteUser' }], weak: true, readOnly: true, group: 'review' }),
  defineField({ name: 'submittedByName', title: 'Ім’я автора заявки', type: 'string', readOnly: true, group: 'review' }),
  defineField({ name: 'submittedAt', title: 'Подано', type: 'datetime', readOnly: true, group: 'review' }),
  defineField({ name: 'resubmittedAt', title: 'Подано повторно після доопрацювання', type: 'datetime', readOnly: true, group: 'review' }),
  defineField({
    name: 'aiReview',
    title: 'AI-перевірка',
    type: 'object',
    readOnly: true,
    group: 'review',
    fields: [
      defineField({ name: 'verdict', title: 'Рішення', type: 'string' }),
      defineField({ name: 'reason', title: 'Пояснення', type: 'text', rows: 2 }),
      defineField({ name: 'flagged', title: 'Порушення правил', type: 'boolean' }),
      defineField({ name: 'categories', title: 'Категорії порушень', type: 'array', of: [{ type: 'string' }] }),
      defineField({ name: 'failed', title: 'AI не зміг перевірити', type: 'boolean' }),
      defineField({ name: 'checkedAt', title: 'Перевірено', type: 'datetime' }),
    ],
  }),
  defineField({
    name: 'moderatorNote',
    title: 'Коментар модератора',
    description: 'Причина відмови або побажання автору. Автор бачить її у своєму кабінеті.',
    type: 'text',
    rows: 3,
    group: 'review',
    validation: (r) => r.max(500),
  }),
  defineField({ name: 'moderatedAt', title: 'Рішення прийнято', type: 'datetime', readOnly: true, group: 'review' }),
]

export const author = defineType({
  name: 'author',
  title: 'Автор',
  type: 'document',
  icon: () => '👤',
  fields: [
    defineField({ name: 'name', title: "Ім'я", type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'role', title: 'Роль', type: 'localeString' }),
    defineField({ name: 'bio', title: 'Біографія', type: 'localeText' }),
    defineField({ name: 'avatar', title: 'Фото', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'user',
      title: 'Акаунт на сайті',
      description: 'Обліковий запис цього автора: його проєкти, теми й коментарі показуються в «Моєму кабінеті».',
      type: 'reference',
      to: [{ type: 'siteUser' }],
      weak: true,
    }),
  ],
})

export const category = defineType({
  name: 'category',
  title: 'Категорія',
  type: 'document',
  icon: () => '🗂',
  fields: [
    defineField({ name: 'title', title: 'Назва', type: 'localeString', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title.uk' }, validation: (r) => r.required() }),
    defineField({
      name: 'icon',
      title: 'Іконка',
      type: 'string',
      options: { list: ['chip', 'board', 'sensor', 'mosfet', 'power', 'passive', 'link'] },
    }),
    defineField({ name: 'order', title: 'Порядок', type: 'number' }),
    defineField({ name: 'description', title: 'Опис', type: 'localeText' }),
  ],
  orderings: [{ title: 'За порядком', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title.uk', subtitle: 'slug.current' } },
})

export const component = defineType({
  name: 'component',
  title: 'Компонент',
  type: 'document',
  icon: () => '🔌',
  groups,
  fields: [
    defineField({ name: 'name', title: 'Позначення', type: 'string', group: 'content', validation: (r) => r.required().max(60) }),
    defineField({ name: 'slug', type: 'slug', group: 'content', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'manufacturer', title: 'Виробник', type: 'string', group: 'content' }),
    defineField({
      name: 'category',
      title: 'Категорія',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'content',
      description: 'Готова плата чи модуль — «Плати та модулі»; окрема мікросхема — категорія за призначенням.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'summary', title: 'Короткий опис', type: 'localeString', group: 'content', validation: (r) => r.required() }),
    defineField({ name: 'description', title: 'Повний опис', type: 'localeText', group: 'content' }),
    defineField({ name: 'image', title: 'Зображення', type: 'image', options: { hotspot: true }, group: 'content' }),
    defineField({
      name: 'specs',
      title: 'Характеристики',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'spec',
          fields: [
            defineField({ name: 'label', title: 'Параметр', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'value', title: 'Значення', type: 'string', validation: (r) => r.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
      ],
    }),
    defineField({ name: 'package', title: 'Корпус або формат плати', description: 'Для мікросхеми — корпус (SOIC-8, LQFP-48). Для плати чи модуля — формат і розмір (плата формату UNO, 68,6 × 53,3 мм).', type: 'string', group: 'content' }),
    defineField({ name: 'priceUah', title: 'Орієнтовна ціна, грн', type: 'number', group: 'content', validation: (r) => r.min(0) }),
    defineField({
      name: 'datasheetUrl',
      title: 'Datasheet',
      type: 'url',
      group: 'content',
      validation: (r) => r.uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'lcscPart',
      title: 'Номер на LCSC',
      description: 'Номер деталі в каталозі LCSC, наприклад C415355. Якщо порожньо, посилання шукає за назвою компонента.',
      type: 'string',
      group: 'content',
      validation: (r) => r.regex(/^C\d{1,9}$/, { name: 'LCSC part number' }),
    }),
    defineField({ name: 'tags', title: 'Теги', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' }, group: 'content' }),
    ...aiFields,
    ...submissionFields,
  ],
  preview: { select: { title: 'name', subtitle: 'summary.uk', media: 'image' } },
})

export const project = defineType({
  name: 'project',
  title: 'DIY-проєкт',
  type: 'document',
  icon: () => '🛠',
  groups,
  fields: [
    defineField({ name: 'title', title: 'Назва', type: 'localeString', group: 'content', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title.uk' }, group: 'content', validation: (r) => r.required() }),
    defineField({ name: 'summary', title: 'Анотація', type: 'localeString', group: 'content', validation: (r) => r.required() }),
    defineField({
      name: 'difficulty',
      title: 'Складність',
      type: 'string',
      group: 'content',
      options: { list: [{ title: 'Легко', value: 'easy' }, { title: 'Середньо', value: 'medium' }, { title: 'Складно', value: 'hard' }], layout: 'radio' },
      initialValue: 'easy',
    }),
    defineField({ name: 'durationHours', title: 'Тривалість, год', type: 'number', group: 'content' }),
    defineField({ name: 'author', title: 'Автор', type: 'reference', to: [{ type: 'author' }], group: 'content' }),
    defineField({ name: 'publishedAt', title: 'Дата публікації', type: 'datetime', group: 'content', initialValue: () => new Date().toISOString() }),
    defineField({ name: 'cover', title: 'Обкладинка', type: 'image', options: { hotspot: true }, group: 'content' }),
    defineField({
      name: 'components',
      title: 'Використані компоненти',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'component' }] })],
    }),
    defineField({
      name: 'steps',
      title: 'Кроки',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'step',
          fields: [
            defineField({ name: 'title', title: 'Заголовок', type: 'localeString' }),
            defineField({ name: 'text', title: 'Текст', type: 'localeText' }),
            defineField({ name: 'image', title: 'Ілюстрація', type: 'image' }),
          ],
          preview: { select: { title: 'title.uk' } },
        }),
      ],
    }),
    ...aiFields,
    ...submissionFields,
  ],
  preview: { select: { title: 'title.uk', subtitle: 'difficulty', media: 'cover' } },
})

export const topic = defineType({
  name: 'topic',
  title: 'Тема форуму',
  type: 'document',
  icon: () => '💬',
  fields: [
    defineField({ name: 'title', title: 'Заголовок', type: 'string', validation: (r) => r.required().max(140) }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'authorName', title: 'Автор', type: 'string' }),
    defineField({ name: 'body', title: 'Питання', type: 'text', rows: 5, validation: (r) => r.required().max(4000) }),
    defineField({ name: 'related', title: "Пов'язаний компонент", type: 'reference', to: [{ type: 'component' }] }),
    defineField({ name: 'pinned', title: 'Закріплена', type: 'boolean', initialValue: false }),
    defineField({ name: 'hidden', title: 'Прихована адміністратором', type: 'boolean', initialValue: false }),
    defineField({ name: 'author', title: 'Користувач', type: 'reference', to: [{ type: 'siteUser' }], weak: true, readOnly: true }),
    defineField({ name: 'createdAt', title: 'Створено', type: 'datetime', initialValue: () => new Date().toISOString() }),
  ],
})

export const comment = defineType({
  name: 'comment',
  title: 'Коментар',
  type: 'document',
  icon: () => '🗨',
  fields: [
    defineField({ name: 'authorName', title: 'Автор', type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'text', title: 'Текст', type: 'text', rows: 4, validation: (r) => r.required().max(2000) }),
    defineField({
      name: 'status',
      title: 'Статус модерації',
      type: 'string',
      options: {
        list: [
          { title: 'На модерації', value: 'pending' },
          { title: 'Схвалено', value: 'approved' },
          { title: 'Відхилено', value: 'rejected' },
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'target',
      title: 'До чого коментар',
      type: 'reference',
      to: [{ type: 'topic' }, { type: 'component' }, { type: 'project' }],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'author', title: 'Користувач', type: 'reference', to: [{ type: 'siteUser' }], weak: true, readOnly: true }),
    defineField({
      name: 'aiModeration',
      title: 'Результат AI-модерації',
      type: 'object',
      readOnly: true,
      fields: [
        defineField({ name: 'flagged', type: 'boolean' }),
        defineField({ name: 'categories', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'checkedAt', type: 'datetime' }),
      ],
    }),
    defineField({ name: 'createdAt', title: 'Створено', type: 'datetime', readOnly: true }),
  ],
  preview: {
    select: { title: 'authorName', subtitle: 'text', status: 'status' },
    prepare: ({ title, subtitle, status }) => ({
      title: `${status === 'approved' ? '✅' : status === 'rejected' ? '⛔' : '⏳'} ${title}`,
      subtitle,
    }),
  },
})

export const siteUser = defineType({
  name: 'siteUser',
  title: 'Користувач сайту',
  type: 'document',
  icon: () => '🔑',
  fields: [
    defineField({ name: 'name', title: "Ім'я", type: 'string', validation: (r) => r.required().max(40) }),
    defineField({ name: 'email', title: 'Email', type: 'string', readOnly: true }),
    defineField({ name: 'passwordHash', type: 'string', hidden: true, readOnly: true }),
    defineField({
      name: 'role',
      title: 'Роль',
      type: 'string',
      options: { list: [{ title: 'Користувач', value: 'user' }, { title: 'Адміністратор', value: 'admin' }], layout: 'radio' },
      initialValue: 'user',
    }),
    defineField({ name: 'blocked', title: 'Заблоковано', type: 'boolean', initialValue: false }),
    defineField({ name: 'createdAt', title: 'Зареєстровано', type: 'datetime', readOnly: true }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'email', role: 'role', blocked: 'blocked' },
    prepare: ({ title, subtitle, role, blocked }) => ({
      title: `${blocked ? '⛔ ' : ''}${title}${role === 'admin' ? ' (адмін)' : ''}`,
      subtitle,
    }),
  },
})

/**
 * Private conversation between a site user and the administrators.
 * Stored with "messages.*" ids, which Sanity keeps private: they are readable
 * only with a token on the server, never through the public API.
 */
export const message = defineType({
  name: 'message',
  title: 'Повідомлення',
  type: 'document',
  icon: () => '✉️',
  fields: [
    defineField({ name: 'thread', title: 'Розмова з користувачем', type: 'reference', to: [{ type: 'siteUser' }], weak: true, readOnly: true }),
    defineField({ name: 'from', title: 'Від', type: 'string', options: { list: [{ title: 'Користувач', value: 'user' }, { title: 'Адміністратор', value: 'admin' }] }, readOnly: true }),
    defineField({ name: 'authorName', title: 'Ім’я', type: 'string', readOnly: true }),
    defineField({ name: 'text', title: 'Текст', type: 'text', rows: 4, readOnly: true }),
    defineField({ name: 'about', title: 'Щодо заявки', type: 'reference', to: [{ type: 'component' }, { type: 'project' }], weak: true, readOnly: true }),
    defineField({ name: 'readByUser', title: 'Прочитано користувачем', type: 'boolean' }),
    defineField({ name: 'readByAdmin', title: 'Прочитано адміністратором', type: 'boolean' }),
    defineField({ name: 'createdAt', title: 'Надіслано', type: 'datetime', readOnly: true }),
  ],
  orderings: [{ title: 'Нові спочатку', name: 'createdDesc', by: [{ field: 'createdAt', direction: 'desc' }] }],
  preview: { select: { title: 'text', subtitle: 'authorName' } },
})
