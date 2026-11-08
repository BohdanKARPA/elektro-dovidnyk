import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { reviewSubmission } from '@/lib/ai'
import { getCategories, getSlugs } from '@/lib/data'
import { revalidateCatalog } from '@/lib/revalidate'
import { createComponent, getOwnSubmission, statusFromReview, updateComponent } from '@/lib/submissions'
import { blankToUndefined, clean, consumeQuota, guardSubmission } from '@/lib/submit-guard'

export const runtime = 'nodejs'

const text = (min: number, max: number) => z.string().transform(clean).pipe(z.string().min(min).max(max))
const optional = (max: number) => z.string().transform(clean).pipe(z.string().max(max)).optional().transform((v) => v || undefined)

const schema = z.object({
  name: text(2, 60),
  manufacturer: optional(60),
  categoryId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
  package: optional(60),
  priceUah: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(1_000_000).optional()),
  summary: text(20, 200),
  description: text(40, 4000),
  specs: z.array(z.object({ label: text(1, 40), value: text(1, 80) })).max(12).default([]),
  datasheetUrl: z.string().trim().url().max(500).refine((u) => u.startsWith('https://'), 'https only').optional().or(z.literal('').transform(() => undefined)),
  lcscPart: z.string().trim().regex(/^C\d{1,9}$/).optional().or(z.literal('').transform(() => undefined)),
  tags: optional(160),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot
  /** Set when the author resubmits a submission returned for changes. */
  id: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/).optional(),
})

/** Submit a component card. AI review decides: publish, reject, or queue for an admin. */
export async function POST(req: NextRequest) {
  const user = await guardSubmission(req, 'component')
  if (user instanceof NextResponse) return user

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', fields: parsed.error.issues.map((i) => i.path.join('.')) }, { status: 400 })
  const d = parsed.data
  if (d.id) {
    const own = await getOwnSubmission(d.id, user._id)
    if (!own || own.kind !== 'component') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (own.status !== 'changes') return NextResponse.json({ error: 'not_editable' }, { status: 409 })
  }
  if (!(await getCategories()).some((c) => c._id === d.categoryId)) return NextResponse.json({ error: 'invalid_input', fields: ['categoryId'] }, { status: 400 })

  const limited = consumeQuota(user, 'component', Boolean(d.id))
  if (limited) return limited

  const tags = (d.tags ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => /^[\p{L}\p{N}+#.-]{1,24}$/u.test(t))
    .slice(0, 8)
  const input = { name: d.name, manufacturer: d.manufacturer, categoryId: d.categoryId, package: d.package, priceUah: d.priceUah, summary: d.summary, description: d.description, specs: d.specs, datasheetUrl: d.datasheetUrl, lcscPart: d.lcscPart, tags }

  const review = user.role === 'admin' ? null : await reviewSubmission('component', { ...input, categoryId: undefined })
  const status = statusFromReview(review, user.role === 'admin')
  const saved = d.id ? { id: d.id, slug: await updateComponent(d.id, input, status, review) } : await createComponent(input, user, status, review, await getSlugs('component'))
  revalidateCatalog()
  return NextResponse.json({ slug: saved.slug, id: saved.id, status, reason: review && !review.failed ? review.reason : null }, { status: d.id ? 200 : 201 })
}
