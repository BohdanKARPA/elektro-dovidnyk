/**
 * Checks the AI setup used by the site (moderation, submission review, translation).
 * Usage:  npm run check:ai      (reads the keys from .env.local)
 *
 * Free providers (no card needed):
 *   GEMINI_API_KEY (or GOOGLE_API_KEY) — https://aistudio.google.com/apikey
 *   GROQ_API_KEY   — https://console.groq.com/keys
 * Paid: OPENAI_API_KEY. AI_MODEL overrides the model of the first provider.
 * Several keys of one provider: comma-separated, e.g. GEMINI_API_KEY=key1,key2
 */
import OpenAI from 'openai'

const PROVIDERS = [
  { name: 'Gemini', env: 'GEMINI_API_KEY', alias: 'GOOGLE_API_KEY', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', models: ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash'], keys: 'https://aistudio.google.com/apikey' },
  { name: 'Groq', env: 'GROQ_API_KEY', baseURL: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], keys: 'https://console.groq.com/keys' },
  { name: 'OpenAI', env: 'OPENAI_API_KEY', models: [process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini', 'gpt-4o-mini'], keys: 'https://platform.openai.com/api-keys' },
]
const preferred = process.env.AI_PROVIDER?.trim().toLowerCase()
if (preferred) PROVIDERS.sort((a, b) => (a.name.toLowerCase() === preferred ? -1 : b.name.toLowerCase() === preferred ? 1 : 0))

const raw = (p) => [process.env[p.env], p.alias && process.env[p.alias]].filter(Boolean).join(',')
const configured = PROVIDERS.filter((p) => raw(p).trim())
if (!configured.length) {
  console.error('✗ No AI key in .env.local. Free option: create a key at https://aistudio.google.com/apikey and add\n  GEMINI_API_KEY=...')
  process.exit(1)
}
const custom = process.env.AI_MODEL?.trim()
if (custom) configured[0].models.unshift(custom)

const explain = (e, p) =>
  e?.status === 401 || (e?.status === 400 && /api key/i.test(e?.message ?? '')) ? `key is invalid or revoked — create a new one at ${p.keys}`
  : e?.status === 429 && e?.code === 'insufficient_quota' ? 'no credit on the account (insufficient_quota)'
  : e?.status === 429 ? 'free-tier rate limit reached (429) — wait a minute and try again'
  : e?.status === 404 ? 'model not available (404)'
  : e?.status === 403 ? 'this key has no access to the model (403)'
  : `${e?.status ?? ''} ${e?.message ?? e}`

let working = null
const runs = configured.flatMap((p) => {
  const keys = [...new Set(raw(p).split(/[,\s]+/).map((k) => k.trim()).filter(Boolean))]
  return keys.map((key, i) => ({ p, key, label: keys.length > 1 ? `${p.name} #${i + 1}` : p.name }))
})
for (const { p, key, label } of runs) {
  if (p.name === 'Gemini' && !key.startsWith('AIza')) console.log(`\n${label}: ⚠ the key does not start with "AIza" — probably copied with a missing character`)
  console.log(`\n${label}  (${key.slice(0, 6)}…${key.slice(-4)})`)
  const client = new OpenAI({ apiKey: key, baseURL: p.baseURL, maxRetries: 0, timeout: 15_000 })
  for (const model of [...new Set(p.models)]) {
    try {
      const t = Date.now()
      const r = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Reply with JSON {"verdict": "approve" | "reject", "reason": "<short Ukrainian sentence>"}.' },
          { role: 'user', content: 'Component card: INA226 — I2C current and power monitor, bus up to 36 V, 16-bit ADC.' },
        ],
      })
      console.log(`  ✓ ${model} works (${Date.now() - t} ms): ${r.choices[0]?.message?.content?.trim().slice(0, 160)}`)
      working ??= `${label} / ${model}`
      break
    } catch (e) {
      console.log(`  ✗ ${model}: ${explain(e, p)}`)
      if (e?.status === 401 || e?.status === 429 || (e?.status === 400 && /api key/i.test(e?.message ?? ''))) break
    }
  }
}

console.log(
  working
    ? `\nAll good — the site will use ${working}. Put the same key into Vercel → Settings → Environment Variables and Redeploy.`
    : '\nNo provider works. Fix the problem above (a free Gemini key: https://aistudio.google.com/apikey), then run this again.',
)
process.exit(working ? 0 : 1)
