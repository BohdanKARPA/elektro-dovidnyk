import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { parseBody } from 'next-sanity/webhook'
import { writeClient } from '@/lib/sanity'
import { aiEnabled, generateSeoDescription, translateToEnglish } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * AI content webhook (bonus task).
 * Sanity webhook: filter  _type in ["component","project"] && aiTranslate == true
 *                 projection {_id, _type}, secret = SANITY_AI_WEBHOOK_SECRET.
 *
 * 1. Finds every localized field whose English value is empty and translates it.
 * 2. Generates an SEO description if the editor left it blank.
 * Writes only missing values, so the patch it makes does not trigger new work
 * (no webhook loops) and editors' manual translations are never overwritten.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

/** Walk a document and collect `path → Ukrainian text` for untranslated locale objects. */
function collectMissing(node: Json, path: string, out: Record<string, string>) {
  if (Array.isArray(node)) {
    node.forEach((item) => {
      if (item && typeof item === 'object' && item._key) collectMissing(item, `${path}[_key=="${item._key}"]`, out)
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const isLocale = typeof node.uk === 'string' && Object.keys(node).every((k) => ['_type', '_key', 'uk', 'en'].includes(k))
  if (isLocale) {
    if (node.uk.trim() && !node.en?.trim()) out[`${path}.en`] = node.uk
    return
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_') || key === 'seoDescription') continue
    collectMissing(value, path ? `${path}.${key}` : key, out)
  }
}

export async function POST(req: NextRequest) {
  const { isValidSignature, body } = await parseBody<{ _id?: string; _type?: string }>(
    req,
    process.env.SANITY_AI_WEBHOOK_SECRET,
    true,
  )
  if (!isValidSignature) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  if (!body?._id || !writeClient || !aiEnabled) return NextResponse.json({ skipped: true })

  const doc = await writeClient.getDocument(body._id)
  if (!doc || !['component', 'project'].includes(doc._type) || doc.aiTranslate === false) {
    return NextResponse.json({ skipped: true })
  }

  const set: Record<string, unknown> = {}

  // 1. Auto-translation
  const missing: Record<string, string> = {}
  collectMissing(doc, '', missing)
  if (Object.keys(missing).length > 0) Object.assign(set, await translateToEnglish(missing))

  // 2. SEO description
  if (!doc.seoDescription?.uk) {
    const title = doc._type === 'component' ? doc.name : doc.title?.uk
    const text = [doc.summary?.uk, doc.description?.uk].filter(Boolean).join('\n\n')
    const seo = await generateSeoDescription(String(title ?? ''), text)
    if (seo) set.seoDescription = { _type: 'localeString', ...seo }
  }

  if (Object.keys(set).length === 0) return NextResponse.json({ updated: 0 })

  await writeClient.patch(doc._id).set(set).commit({ autoGenerateArrayKeys: true })
  revalidateTag(doc._type, { expire: 0 })
  return NextResponse.json({ updated: Object.keys(set).length })
}
