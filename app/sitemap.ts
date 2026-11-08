import type { MetadataRoute } from 'next'
import { getSlugs } from '@/lib/data'
import { LANGS } from '@/lib/i18n'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [components, projects, topics] = await Promise.all([getSlugs('component'), getSlugs('project'), getSlugs('topic')])
  const paths = [
    '',
    '/components',
    '/projects',
    '/forum',
    '/about',
    ...components.map((s) => `/components/${s}`),
    ...projects.map((s) => `/projects/${s}`),
    ...topics.map((s) => `/forum/${s}`),
  ]
  return paths.flatMap((p) =>
    LANGS.map((lang) => ({
      url: `${base}/${lang}${p}`,
      alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `${base}/${l}${p}`])) },
    })),
  )
}
