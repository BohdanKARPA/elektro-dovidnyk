import 'server-only'
import OpenAI from 'openai'

/**
 * AI helpers (bonus task). All calls run server-side only; keys are never
 * exposed to the browser. Every function degrades gracefully when no key is
 * set, so the site keeps working without AI.
 *
 * Providers (all speak the OpenAI Chat Completions protocol):
 *   GEMINI_API_KEY (or GOOGLE_API_KEY) — Google AI Studio, free tier, no card (aistudio.google.com/apikey)
 *   GROQ_API_KEY   — Groq, free tier, no card               (console.groq.com/keys)
 *   OPENAI_API_KEY — OpenAI, paid
 * Several providers and several keys per provider (comma-separated) may be
 * set: when one is out of its free quota or down, the next one is tried.
 * AI_MODEL overrides the first provider's model.
 */

type ProviderName = 'gemini' | 'groq' | 'openai'
interface Provider {
  name: ProviderName
  label: string
  client: OpenAI
  models: string[]
}

const PROVIDERS: Record<ProviderName, { label: string; env: string; alias?: string; baseURL?: string; models: string[] }> = {
  // "*-latest" aliases follow Google's current models, so the site keeps working when old ones are retired.
  // Flash-Lite first: it answers in about a second and is enough for review and moderation; Flash is the fallback.
  gemini: { label: 'Gemini', env: 'GEMINI_API_KEY', alias: 'GOOGLE_API_KEY', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', models: ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash'] },
  groq: { label: 'Groq', env: 'GROQ_API_KEY', baseURL: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  openai: { label: 'OpenAI', env: 'OPENAI_API_KEY', models: ['gpt-5-mini', 'gpt-4o-mini'] },
}

const REQUEST_TIMEOUT_MS = 15_000
/** Overall time budget of one AI task across all keys and models. */
const TOTAL_BUDGET_MS = 40_000

function setupProviders(): Provider[] {
  const order: ProviderName[] = ['gemini', 'groq', 'openai']
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase() as ProviderName | undefined
  if (preferred && order.includes(preferred)) order.sort((a, b) => (a === preferred ? -1 : b === preferred ? 1 : 0))

  const out: Provider[] = []
  let firstName: ProviderName | undefined
  for (const name of order) {
    const cfg = PROVIDERS[name]
    // Several keys may be listed, separated by commas: when one hits its limit (429) the next one is used.
    const keys = [...new Set([process.env[cfg.env], cfg.alias && process.env[cfg.alias]].filter(Boolean).join(',').split(/[,\s]+/).map((k) => k.trim()).filter(Boolean))]
    if (!keys.length) continue
    firstName ??= name
    const first = name === firstName
    const custom = (first ? process.env.AI_MODEL : undefined) || (name === 'openai' ? process.env.OPENAI_MODEL : undefined)
    const models = [...new Set([custom?.trim(), ...cfg.models].filter(Boolean) as string[])]
    // AI_BASE_URL points the first provider at another OpenAI-compatible endpoint (a proxy, a local model, a test server).
    const baseURL = (first && process.env.AI_BASE_URL?.trim()) || cfg.baseURL
    keys.forEach((apiKey, i) => {
      const label = keys.length > 1 ? `${cfg.label} #${i + 1}` : cfg.label
      out.push({ name, label, client: new OpenAI({ apiKey, baseURL, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS }), models })
    })
  }
  return out
}

const providers = setupProviders()
export const aiEnabled = providers.length > 0
const openaiProvider = providers.find((p) => p.name === 'openai')

type Err = { status?: number; code?: string; message?: string; error?: { message?: string } }

/** A short Ukrainian explanation of a provider error for the admin panel. */
function explainAiError(err: unknown, label: string): string {
  const e = err as Err
  if (e?.status === 401 || (e?.status === 400 && /api key/i.test(e?.message ?? ''))) return `ключ ${label} недійсний або відкликаний`
  if (e?.status === 429) return e.code === 'insufficient_quota' ? `на рахунку ${label} немає коштів (insufficient_quota)` : `вичерпано безкоштовний ліміт запитів ${label} (429), спробуйте пізніше`
  if (e?.status === 403) return `ключ ${label} не має доступу до моделі (403)`
  if (e?.status === 404) return `модель ${label} недоступна (404)`
  if (/timed? ?out/i.test(`${(e as { name?: string })?.name} ${e?.message}`)) return `${label} не відповів вчасно`
  return `помилка ${label}${e?.status ? ` (${e.status})` : ''}: ${String(e?.message ?? err).slice(0, 120)}`
}

/** Pull a JSON object out of a model reply, tolerating ```json fences, <think> blocks and stray text. */
function parseJson(text: string | null | undefined): Record<string, unknown> {
  if (!text) return {}
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/gi, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        /* fall through */
      }
    }
    return {}
  }
}

class AiUnavailable extends Error {
  constructor(public why: string) {
    super(why)
  }
}

/**
 * One JSON-mode chat request with failover: each provider's models in turn,
 * then the next provider. Errors that a different model or provider can fix
 * (model missing, quota, outage) move on; the last error is reported.
 */
/**
 * Remembers what failed recently (per server instance) so later requests skip
 * it instead of waiting again: a key out of quota for a minute, a key that is
 * invalid for an hour, a model that is missing or keeps timing out for a while.
 */
const skipUntil = new Map<string, number>()
const cool = (key: string, ms: number) => skipUntil.set(key, Date.now() + ms)
const cooling = (key: string) => (skipUntil.get(key) ?? 0) > Date.now()

async function chatJson(system: string, user: string): Promise<{ data: Record<string, unknown>; blocked: boolean }> {
  if (!providers.length) throw new AiUnavailable('на сервері не задано ключ AI (GEMINI_API_KEY, GROQ_API_KEY або OPENAI_API_KEY)')
  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
  const started = Date.now()
  let last = ''
  let tried = 0

  const attempts = providers.flatMap((p) => p.models.map((model) => ({ p, model })))
  // Everything cooling down (e.g. all keys hit the limit a moment ago)? Try once anyway rather than fail outright.
  const fresh = attempts.filter(({ p, model }) => !cooling(p.label) && !cooling(`${p.label}|${model}`))
  for (const { p, model } of fresh.length ? fresh : attempts.slice(0, 1)) {
    if (cooling(p.label) && fresh.length) continue // the key was put on hold by an earlier attempt in this loop
    if (Date.now() - started > TOTAL_BUDGET_MS) break
    tried++
    try {
      let res
      try {
        res = await p.client.chat.completions.create({ model, messages, response_format: { type: 'json_object' } })
      } catch (err) {
        // Some models reject JSON mode; ask again without it and parse the text.
        if ((err as Err).status !== 400 || /api key/i.test((err as Err).message ?? '')) throw err
        res = await p.client.chat.completions.create({ model, messages })
      }
      const choice = res.choices[0]
      const blocked = choice?.finish_reason === 'content_filter'
      return { data: parseJson(choice?.message?.content), blocked }
    } catch (err) {
      const e = err as Err & { name?: string }
      last = explainAiError(err, p.label)
      console.warn(`[ai] ${p.label} ${model} failed: ${last}`)
      if (e.status === 401 || e.status === 403 || (e.status === 400 && /api key/i.test(e.message ?? ''))) cool(p.label, 60 * 60_000) // bad key
      else if (e.status === 429) cool(p.label, 60_000) // quota is per key/project, not per model
      else if (e.status === 404) cool(`${p.label}|${model}`, 6 * 60 * 60_000) // model not offered to this key
      else if (/timed? ?out/i.test(`${e.name} ${e.message}`)) cool(`${p.label}|${model}`, 10 * 60_000)
    }
  }
  throw new AiUnavailable(last || (tried ? 'AI не відповів' : 'усі ключі AI тимчасово недоступні'))
}

export interface ModerationResult {
  flagged: boolean
  categories: string[]
}

const MODERATION_PROMPT = [
  'You moderate short user texts (comments, forum posts, private messages) on a Ukrainian electronics website.',
  'Flag the text only when it contains insults or harassment, hate speech, threats or violence, sexual content, spam or advertising, scams, or instructions for causing harm.',
  'Ordinary technical talk, criticism, disagreement and mild frustration are fine.',
  'Reply with JSON {"flagged": true | false, "categories": ["harassment" | "hate" | "violence" | "sexual" | "spam" | "scam" | "self-harm" | "illicit"]}.',
].join(' ')

/** Abuse check: OpenAI's free Moderation endpoint when an OpenAI key is set, otherwise the chat model. Null = could not check. */
export async function moderate(text: string): Promise<ModerationResult | null> {
  if (openaiProvider) {
    try {
      const res = await openaiProvider.client.moderations.create({ model: 'omni-moderation-latest', input: text })
      const r = res.results[0]
      return { flagged: r.flagged, categories: Object.entries(r.categories).filter(([, v]) => v).map(([k]) => k) }
    } catch (err) {
      console.warn('[ai] OpenAI moderation failed, using the chat model', explainAiError(err, 'OpenAI'))
    }
  }
  try {
    const { data, blocked } = await chatJson(MODERATION_PROMPT, text.slice(0, 6000))
    if (blocked) return { flagged: true, categories: ['blocked'] }
    if (typeof data.flagged !== 'boolean') return null
    const categories = Array.isArray(data.categories) ? data.categories.filter((c): c is string => typeof c === 'string').slice(0, 8) : []
    return { flagged: data.flagged, categories: data.flagged ? categories : [] }
  } catch (err) {
    console.error('[ai] moderation failed', err instanceof AiUnavailable ? err.why : err)
    return null // fail closed: caller leaves the text pending for a human
  }
}

/**
 * Translate a flat map of Ukrainian strings to English in one request.
 * Returns the same keys (only the ones the model translated).
 */
export async function translateToEnglish(fields: Record<string, string>): Promise<Record<string, string>> {
  if (!aiEnabled || Object.keys(fields).length === 0) return {}
  const { data } = await chatJson(
    'You translate Ukrainian electronics reference content into concise technical English. ' +
      'Keep part numbers, units and formatting (including blank lines) unchanged. ' +
      'Reply with a JSON object that has exactly the same keys as the input.',
    JSON.stringify(fields),
  )
  const out: Record<string, string> = {}
  for (const key of Object.keys(fields)) if (typeof data[key] === 'string') out[key] = data[key] as string
  return out
}

/** Generate a meta description (≤160 chars) in both languages. */
export async function generateSeoDescription(title: string, body: string): Promise<{ uk: string; en: string } | null> {
  if (!aiEnabled) return null
  const { data } = await chatJson(
    'Write an SEO meta description for an electronics reference page. ' +
      'Return JSON {"uk": "...", "en": "..."}; each value at most 155 characters, no quotes or emoji.',
    `Title: ${title}\n\n${body.slice(0, 3000)}`,
  )
  if (typeof data.uk !== 'string' || typeof data.en !== 'string') return null
  return { uk: data.uk.slice(0, 160), en: data.en.slice(0, 160) }
}

export interface SubmissionReview {
  verdict: 'approve' | 'revise' | 'reject' | 'review'
  /** One short sentence in Ukrainian, shown to the author (or, when `failed`, to the admin only). */
  reason: string
  flagged: boolean
  categories: string[]
  /** The AI could not run (no key, invalid key, quota…): a human decides. */
  failed?: boolean
}

const failed = (why: string): SubmissionReview => ({ verdict: 'review', reason: `Перевірка не вдалася — ${why}.`, flagged: false, categories: [], failed: true })
const FLAGGED_REASON = 'Текст порушує правила сайту, тому його не опубліковано.'

const REVIEW_PROMPT = [
  'You review user submissions to a public Ukrainian reference website about electronics.',
  'The submission is either an electronic component card (kind "component") or a DIY electronics project (kind "project").',
  'First, set "flagged": true if it contains insults, hate speech, threats, sexual content, scams or instructions for causing harm; then the verdict is "reject".',
  'Approve it when it is a genuine, on-topic, coherent description that a hobbyist would find useful.',
  'Answer "revise" when it is on-topic and honest but incomplete or has fixable problems (too short, missing key specs, unclear steps, small technical errors);',
  'then the reason must say exactly what to add or fix.',
  'Reject only spam, advertising, links-only or shop promotion, gibberish, off-topic text, insults, and deliberately false content.',
  'Answer "review" (a human moderator decides) when you are unsure, when specifications look doubtful,',
  'or when the project involves mains voltage, high-energy batteries or other hazards without safety notes.',
  'Reply with JSON {"verdict": "approve" | "revise" | "reject" | "review", "flagged": true | false, "reason": "<one or two short sentences in Ukrainian addressed to the author>"}.',
].join(' ')

/**
 * Check of a user submission: abuse (OpenAI Moderation when available,
 * otherwise part of the same prompt) and relevance/quality. Always returns a
 * review; `failed` means AI could not run and an admin decides.
 */
export async function reviewSubmission(kind: 'component' | 'project', fields: Record<string, unknown>): Promise<SubmissionReview> {
  if (!aiEnabled) return failed('на сервері не задано ключ AI (GEMINI_API_KEY, GROQ_API_KEY або OPENAI_API_KEY)')

  let categories: string[] = []
  if (openaiProvider) {
    try {
      const res = await openaiProvider.client.moderations.create({ model: 'omni-moderation-latest', input: JSON.stringify(fields).slice(0, 8000) })
      const r = res.results[0]
      categories = Object.entries(r.categories).filter(([, v]) => v).map(([k]) => k)
      if (r.flagged) return { verdict: 'reject', reason: FLAGGED_REASON, flagged: true, categories }
    } catch (err) {
      console.warn('[ai] OpenAI moderation failed, relying on the review prompt', explainAiError(err, 'OpenAI'))
    }
  }

  try {
    const { data, blocked } = await chatJson(REVIEW_PROMPT, JSON.stringify({ kind, ...fields }).slice(0, 12000))
    if (blocked || data.flagged === true) return { verdict: 'reject', reason: FLAGGED_REASON, flagged: true, categories: blocked ? ['blocked'] : categories }
    const v = data.verdict
    const verdict = v === 'approve' || v === 'revise' || v === 'reject' || v === 'review' ? v : 'review'
    const reason = typeof data.reason === 'string' ? data.reason.slice(0, 300) : ''
    if (!reason && v === undefined) return failed('AI повернув відповідь у незрозумілому форматі')
    return { verdict, reason, flagged: false, categories }
  } catch (err) {
    console.error('[ai] submission review failed', err)
    return failed(err instanceof AiUnavailable ? err.why : explainAiError(err, providers[0].label))
  }
}
