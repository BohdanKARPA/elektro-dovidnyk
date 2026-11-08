/**
 * Admin panel: Sanity Studio mounted at /studio.
 * Access is controlled by Sanity itself — only members of the Sanity project
 * (Administrator / Editor / Viewer roles) can sign in and edit content.
 */
import { NextStudio } from 'next-sanity/studio'
import config from '../../../sanity.config'

export const dynamic = 'force-static'
export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <NextStudio config={config} />
}
