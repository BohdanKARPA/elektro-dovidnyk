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
      options: { list: ['chip', 'sensor', 'mosfet', 'power', 'passive'] },
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
    defineField({ name: 'package', title: 'Корпус', type: 'string', group: 'content' }),
    defineField({ name: 'priceUah', title: 'Орієнтовна ціна, грн', type: 'number', group: 'content', validation: (r) => r.min(0) }),
    defineField({
      name: 'datasheetUrl',
      title: 'Datasheet',
      type: 'url',
      group: 'content',
      validation: (r) => r.uri({ scheme: ['https'] }),
    }),
    defineField({ name: 'tags', title: 'Теги', type: 'array', of: [{ type: 'string' }], options: { layout: 'tags' }, group: 'content' }),
    ...aiFields,
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
