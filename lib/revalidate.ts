import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * After a comment or topic changes (posted, approved, rejected, hidden),
 * drop the cached pages that show user content so the next visitor sees it.
 */
export function revalidateCommunity() {
  revalidateTag('comment', { expire: 0 })
  revalidateTag('topic', { expire: 0 })
  for (const route of ['/[lang]', '/[lang]/forum', '/[lang]/forum/[slug]', '/[lang]/components/[slug]', '/[lang]/projects/[slug]']) {
    revalidatePath(route, 'page')
  }
}

/** After a component or project is submitted or moderated. */
export function revalidateCatalog() {
  revalidateTag('component', { expire: 0 })
  revalidateTag('project', { expire: 0 })
  for (const route of ['/[lang]', '/[lang]/components', '/[lang]/components/[slug]', '/[lang]/projects', '/[lang]/projects/[slug]', '/[lang]/about']) {
    revalidatePath(route, 'page')
  }
}
