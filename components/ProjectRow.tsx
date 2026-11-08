import Link from 'next/link'
import { Difficulty } from './Difficulty'
import { ProjectCover } from './ProjectCover'
import type { Dict } from '@/lib/i18n'
import { formatDate, t } from '@/lib/i18n'
import type { Lang, ProjectDoc } from '@/lib/types'

/** One row of a project list: generated cover, title, summary and meta. */
export function ProjectRow({ p, lang, dict, meta = 'full' }: { p: ProjectDoc; lang: Lang; dict: Dict; meta?: 'full' | 'short' }) {
  return (
    <li>
      <Link href={`/${lang}/projects/${p.slug}`}>
        <span className="row-cover">
          <ProjectCover parts={p.components} />
        </span>
        <span className="row-text">
          <h3>{t(p.title, lang)}</h3>
          <p>{t(p.summary, lang)}</p>
        </span>
        <span className="side">
          <Difficulty value={p.difficulty} dict={dict} />
          {meta === 'full' && p.durationHours ? (
            <span>
              {p.durationHours} {dict.hours}
            </span>
          ) : null}
          {meta === 'full' && <span>{formatDate(p.publishedAt, lang)}</span>}
        </span>
      </Link>
    </li>
  )
}
