'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { ClientSubmitDict as SubmitDict } from '@/lib/i18n-submit'
import type { Lang } from '@/lib/types'

type Me = { name: string; blocked: boolean } | null
type Result = { status: 'published' | 'pending' | 'changes' | 'rejected'; slug: string; id?: string; reason: string | null }

export interface ComponentInitial {
  id: string
  name: string
  manufacturer?: string
  categoryId: string
  package?: string
  priceUah?: number
  summary: string
  description: string
  specs: { label: string; value: string }[]
  datasheetUrl?: string
  lcscPart?: string
  tags: string[]
}
export interface ProjectInitial {
  id: string
  title: string
  summary: string
  difficulty: 'easy' | 'medium' | 'hard'
  durationHours?: number
  componentIds: string[]
  steps: { title: string; text: string }[]
}

/** Shows the form only to signed-in, non-blocked users. */
function useMe() {
  const [me, setMe] = useState<Me | undefined>(undefined)
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null))
  }, [])
  return me
}

function Gate({ me, lang, back, l, children }: { me: Me | undefined; lang: Lang; back: string; l: SubmitDict; children: ReactNode }) {
  if (me === undefined) return <div className="skeleton" aria-hidden="true" />
  if (me === null)
    return (
      <div className="comment-form">
        <p className="form-note">{l.authRequired}</p>
        <div>
          <Link className="btn" href={`/${lang}/login?next=${back}`}>
            {l.signIn}
          </Link>
        </div>
      </div>
    )
  if (me.blocked) return <p className="notice">{l.errors.blocked}</p>
  return <>{children}</>
}

async function send(url: string, body: unknown, l: SubmitDict): Promise<{ ok: true; result: Result } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const key = json.error as keyof SubmitDict['errors']
      return { ok: false, message: l.errors[key] ?? l.errors.generic }
    }
    return { ok: true, result: json as Result }
  } catch {
    return { ok: false, message: l.errors.generic }
  }
}

function Outcome({ result, href, lang, l }: { result: Result; href: string; lang: Lang; l: SubmitDict }) {
  return (
    <div className={`submit-result ${result.status}`} role="status">
      <p>
        <strong>{l.result[result.status]}</strong>
        {result.reason && (
          <>
            {' '}
            {l.aiSays} {result.reason}
          </>
        )}
      </p>
      <div className="actions">
        {result.status === 'published' && (
          <Link className="btn" href={href}>
            {l.result.open}
          </Link>
        )}
        {result.status === 'changes' && result.id && (
          <Link className="btn" href={`/${lang}/account/edit/${result.id}`}>
            {l.fix}
          </Link>
        )}
        <Link className="btn ghost" href={`/${lang}/account`}>
          {l.result.toAccount}
        </Link>
      </div>
    </div>
  )
}

/* ------------------------------ component ------------------------------ */

export function ComponentSubmitForm({ lang, l, categories, initial }: { lang: Lang; l: SubmitDict; categories: { id: string; title: string }[]; initial?: ComponentInitial }) {
  const me = useMe()
  const [specs, setSpecs] = useState(initial?.specs.length ? initial.specs.map((sp, i) => ({ k: i, ...sp })) : [{ k: 0, label: '', value: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setBusy(true)
    setError(null)
    const r = await send(
      '/api/submissions/component',
      {
        name: f.name,
        manufacturer: f.manufacturer,
        categoryId: f.categoryId,
        package: f.package,
        priceUah: f.priceUah,
        summary: f.summary,
        description: f.description,
        specs: specs.filter((s) => s.label.trim() && s.value.trim()).map(({ label, value }) => ({ label, value })),
        datasheetUrl: f.datasheetUrl,
        lcscPart: f.lcscPart,
        tags: f.tags,
        website: f.website,
        ...(initial && { id: initial.id }),
      },
      l,
    )
    setBusy(false)
    if (r.ok) setResult(r.result)
    else setError(r.message)
  }

  if (result) return <Outcome result={result} href={`/${lang}/components/${result.slug}`} lang={lang} l={l} />

  return (
    <Gate me={me} lang={lang} back={initial ? `/${lang}/account/edit/${initial.id}` : `/${lang}/components/new`} l={l}>
      <form className="comment-form submit-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            {l.f.name}
            <input name="name" required minLength={2} maxLength={60} placeholder={l.f.namePh} defaultValue={initial?.name} />
          </label>
          <label>
            {l.f.manufacturer}
            <input name="manufacturer" maxLength={60} defaultValue={initial?.manufacturer} />
          </label>
          <label>
            {l.f.category}
            <select name="categoryId" required defaultValue={initial?.categoryId ?? ''}>
              <option value="" disabled>
                {l.f.chooseCategory}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            {l.f.package}
            <input name="package" maxLength={60} placeholder={l.f.packagePh} defaultValue={initial?.package} />
          </label>
          <label>
            {l.f.price}
            <input name="priceUah" type="number" min={0} max={1000000} step="any" inputMode="decimal" defaultValue={initial?.priceUah} />
          </label>
          <label>
            {l.f.lcsc}
            <input name="lcscPart" pattern="C[0-9]{1,9}" maxLength={10} defaultValue={initial?.lcscPart} />
          </label>
        </div>
        <label>
          {l.f.summary}
          <input name="summary" required minLength={20} maxLength={200} defaultValue={initial?.summary} />
        </label>
        <label>
          {l.f.description}
          <textarea name="description" required minLength={40} maxLength={4000} rows={6} defaultValue={initial?.description} />
          <span className="dim">{l.f.descriptionHint}</span>
        </label>

        <fieldset className="rows">
          <legend>{l.f.specs}</legend>
          {specs.map((s, i) => (
            <div key={s.k} className="row-pair">
              <input aria-label={`${l.f.specLabel} ${i + 1}`} placeholder={l.f.specLabel} maxLength={40} value={s.label} onChange={(e) => setSpecs((p) => p.map((x) => (x.k === s.k ? { ...x, label: e.target.value } : x)))} />
              <input aria-label={`${l.f.specValue} ${i + 1}`} placeholder={l.f.specValue} maxLength={80} value={s.value} onChange={(e) => setSpecs((p) => p.map((x) => (x.k === s.k ? { ...x, value: e.target.value } : x)))} />
              <button type="button" className="btn ghost small" onClick={() => setSpecs((p) => p.filter((x) => x.k !== s.k))} disabled={specs.length === 1}>
                {l.f.remove}
              </button>
            </div>
          ))}
          {specs.length < 12 && (
            <button type="button" className="btn ghost small" onClick={() => setSpecs((p) => [...p, { k: Date.now(), label: '', value: '' }])}>
              + {l.f.addSpec}
            </button>
          )}
        </fieldset>

        <div className="form-grid">
          <label>
            {l.f.datasheet}
            <input name="datasheetUrl" type="url" pattern="https://.*" maxLength={500} defaultValue={initial?.datasheetUrl} />
          </label>
          <label>
            {l.f.tags}
            <input name="tags" maxLength={160} placeholder="i2c, sensor" defaultValue={initial?.tags.join(', ')} />
          </label>
        </div>
        <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        {error && (
          <p className="form-note err" role="alert">
            {error}
          </p>
        )}
        <div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? l.f.sending : initial ? l.resubmit : l.f.submit}
          </button>
        </div>
      </form>
    </Gate>
  )
}

/* ------------------------------- project ------------------------------- */

export function ProjectSubmitForm({
  lang,
  l,
  parts,
  difficulty,
  initial,
}: {
  lang: Lang
  l: SubmitDict
  parts: { id: string; name: string; category: string }[]
  difficulty: { easy: string; medium: string; hard: string }
  initial?: ProjectInitial
}) {
  const me = useMe()
  const [steps, setSteps] = useState(initial?.steps.length ? initial.steps.map((st, i) => ({ k: i, ...st })) : [{ k: 0, title: '', text: '' }])
  const [picked, setPicked] = useState<string[]>(initial?.componentIds ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (picked.length === 0) {
      setError(l.f.partsHint)
      return
    }
    setBusy(true)
    setError(null)
    const r = await send(
      '/api/submissions/project',
      {
        title: f.title,
        summary: f.summary,
        difficulty: f.difficulty,
        durationHours: f.durationHours,
        componentIds: picked,
        steps: steps.map(({ title, text }) => ({ title, text })),
        website: f.website,
        ...(initial && { id: initial.id }),
      },
      l,
    )
    setBusy(false)
    if (r.ok) setResult(r.result)
    else setError(r.message)
  }

  if (result) return <Outcome result={result} href={`/${lang}/projects/${result.slug}`} lang={lang} l={l} />

  return (
    <Gate me={me} lang={lang} back={initial ? `/${lang}/account/edit/${initial.id}` : `/${lang}/projects/new`} l={l}>
      <form className="comment-form submit-form" onSubmit={onSubmit}>
        <label>
          {l.f.title}
          <input name="title" required minLength={8} maxLength={120} defaultValue={initial?.title} />
        </label>
        <label>
          {l.f.projectSummary}
          <textarea name="summary" required minLength={20} maxLength={240} rows={2} defaultValue={initial?.summary} />
        </label>
        <div className="form-grid">
          <label>
            {l.f.difficulty}
            <select name="difficulty" defaultValue={initial?.difficulty ?? 'easy'}>
              <option value="easy">{difficulty.easy}</option>
              <option value="medium">{difficulty.medium}</option>
              <option value="hard">{difficulty.hard}</option>
            </select>
          </label>
          <label>
            {l.f.hours}
            <input name="durationHours" type="number" min={1} max={500} step={1} inputMode="numeric" defaultValue={initial?.durationHours} />
          </label>
        </div>

        <fieldset className="rows">
          <legend>{l.f.parts}</legend>
          <p className="dim">{l.f.partsHint}</p>
          <div className="part-picks">
            {parts.map((p) => {
              const on = picked.includes(p.id)
              return (
                <label key={p.id} className={`part-pick${on ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && picked.length >= 8}
                    onChange={() => setPicked((x) => (on ? x.filter((i) => i !== p.id) : [...x, p.id]))}
                  />
                  <span>
                    {p.name}
                    <span className="dim">{p.category}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="rows">
          <legend>{l.f.steps}</legend>
          <ol className="step-inputs">
            {steps.map((s, i) => (
              <li key={s.k}>
                <input
                  aria-label={`${l.f.stepTitle} ${i + 1}`}
                  placeholder={l.f.stepTitle}
                  required
                  minLength={3}
                  maxLength={100}
                  value={s.title}
                  onChange={(e) => setSteps((p) => p.map((x) => (x.k === s.k ? { ...x, title: e.target.value } : x)))}
                />
                <textarea
                  aria-label={`${l.f.stepText} ${i + 1}`}
                  placeholder={l.f.stepText}
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={3}
                  value={s.text}
                  onChange={(e) => setSteps((p) => p.map((x) => (x.k === s.k ? { ...x, text: e.target.value } : x)))}
                />
                {steps.length > 1 && (
                  <button type="button" className="btn ghost small" onClick={() => setSteps((p) => p.filter((x) => x.k !== s.k))}>
                    {l.f.remove}
                  </button>
                )}
              </li>
            ))}
          </ol>
          {steps.length < 12 && (
            <button type="button" className="btn ghost small" onClick={() => setSteps((p) => [...p, { k: Date.now(), title: '', text: '' }])}>
              + {l.f.addStep}
            </button>
          )}
        </fieldset>

        <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        {error && (
          <p className="form-note err" role="alert">
            {error}
          </p>
        )}
        <div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? l.f.sending : initial ? l.resubmit : l.f.submit}
          </button>
        </div>
      </form>
    </Gate>
  )
}
