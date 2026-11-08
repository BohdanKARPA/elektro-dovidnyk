import 'server-only'
import OpenAI from 'openai'

/**
 * AI helpers (bonus task). All calls run server-side only; the OpenAI key
 * is never exposed to the browser. Every function degrades gracefully when
 * OPENAI_API_KEY is not set, so the site keeps working without AI.
 */
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'

export const aiEnabled = Boolean(openai)

export interface ModerationResult {
  flagged: boolean
  categories: string[]
}

/** Comment moderation via the OpenAI Moderation endpoint (free to use). */
export async function moderate(text: string): Promise<ModerationResult | null> {
  if (!openai) return null
  try {
    const res = await openai.moderations.create({ model: 'omni-moderation-latest', input: text })
    const r = res.results[0]
    const categories = Object.entries(r.categories)
      .filter(([, v]) => v)
      .map(([k]) => k)
    return { flagged: r.flagged, categories }
  } catch (err) {
    console.error('[ai] moderation failed', err)
    return null // fail closed: caller leaves the comment pending for a human
  }
}

/**
 * Translate a flat map of Ukrainian strings to English in one request.
 * Returns the same keys. Uses JSON mode so the output is machine-parseable.
 */
export async function translateToEnglish(fields: Record<string, string>): Promise<Record<string, string>> {
  if (!openai || Object.keys(fields).length === 0) return {}
  const res = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You translate Ukrainian electronics reference content into concise technical English. ' +
          'Keep part numbers, units and formatting (including blank lines) unchanged. ' +
          'Reply with a JSON object that has exactly the same keys as the input.',
      },
      { role: 'user', content: JSON.stringify(fields) },
    ],
  })
  const parsed = JSON.parse(res.choices[0]?.message?.content || '{}') as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const key of Object.keys(fields)) {
    if (typeof parsed[key] === 'string') out[key] = parsed[key] as string
  }
  return out
}

/** Generate a meta description (≤160 chars) in both languages. */
export async function generateSeoDescription(title: string, body: string): Promise<{ uk: string; en: string } | null> {
  if (!openai) return null
  const res = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Write an SEO meta description for an electronics reference page. ' +
          'Return JSON {"uk": "...", "en": "..."}; each value at most 155 characters, no quotes or emoji.',
      },
      { role: 'user', content: `Title: ${title}\n\n${body.slice(0, 3000)}` },
    ],
  })
  const parsed = JSON.parse(res.choices[0]?.message?.content || '{}')
  if (typeof parsed.uk !== 'string' || typeof parsed.en !== 'string') return null
  return { uk: parsed.uk.slice(0, 160), en: parsed.en.slice(0, 160) }
}
