import { defineField, defineType } from 'sanity'

export const LANGUAGES = [
  { id: 'uk', title: 'Українська', isDefault: true },
  { id: 'en', title: 'English' },
] as const

/** Field-level i18n: every translatable field is an object { uk, en }. */
export const localeString = defineType({
  name: 'localeString',
  title: 'Локалізований рядок',
  type: 'object',
  fieldsets: [{ name: 'translations', title: 'Переклади', options: { collapsible: true, collapsed: false } }],
  fields: LANGUAGES.map((lang) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: 'string',
      fieldset: 'isDefault' in lang ? undefined : 'translations',
      validation: (rule) => ('isDefault' in lang ? rule.required().max(200) : rule.max(200)),
    }),
  ),
})

export const localeText = defineType({
  name: 'localeText',
  title: 'Локалізований текст',
  type: 'object',
  fieldsets: [{ name: 'translations', title: 'Переклади', options: { collapsible: true, collapsed: false } }],
  fields: LANGUAGES.map((lang) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: 'text',
      rows: 6,
      fieldset: 'isDefault' in lang ? undefined : 'translations',
      validation: (rule) => ('isDefault' in lang ? rule.required().max(8000) : rule.max(8000)),
    }),
  ),
})
