import 'server-only'
import { createClient } from 'next-sanity'
import { createImageUrlBuilder } from '@sanity/image-url'
import { apiVersion, dataset, isSanityConfigured, projectId } from '@/sanity/env'
import type { SanityImage } from './types'

/** Public read client: CDN, published documents only. */
export const client = isSanityConfigured
  ? createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: 'published' })
  : null

/**
 * Write client: used only on the server (comment API, AI webhook).
 * The token never reaches the browser — it has no NEXT_PUBLIC_ prefix.
 */
export const writeClient =
  isSanityConfigured && process.env.SANITY_API_WRITE_TOKEN
    ? createClient({ projectId, dataset, apiVersion, useCdn: false, token: process.env.SANITY_API_WRITE_TOKEN })
    : null

const builder = isSanityConfigured ? createImageUrlBuilder({ projectId, dataset }) : null

export function imageUrl(source: SanityImage | null | undefined, width = 800): string | null {
  if (!builder || !source?.asset) return null
  return builder.image(source).width(width).auto('format').fit('max').url()
}

/** Cached GROQ fetch with tag-based on-demand revalidation (see /api/revalidate). */
export async function sanityFetch<T>(query: string, params: Record<string, unknown>, tags: string[]): Promise<T> {
  if (!client) throw new Error('Sanity is not configured')
  return client.fetch<T>(query, params, { next: { revalidate: 3600, tags } })
}
